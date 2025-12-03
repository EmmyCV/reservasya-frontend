import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../services/supabase";

// Paleta corporativa
const COMPANY_PALETTE = [
  "#A35C58",
  "#D8AFA7",
  "#D2B4A3",
  "#8C847E",
  "#F0E0D4",
  "#FCF8F5",
];

// Colores por empleado
const EVENT_PALETTE = [
  "#FF9B8D",
  "#A95E73",
  "#D8AFA7",
  "#7FD0E2",
  "#73A954",
  "#73A956",
  "#5E7349",
];

// Colores fijos por estado
const COLOR_CANCELADA = "#D9534F";
const COLOR_REALIZADA = "#6BBF59";

// hashing color por empleado
const getEventColorForEmployee = (id) => {
  if (!id) return EVENT_PALETTE[0];
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % EVENT_PALETTE.length;
  return EVENT_PALETTE[idx];
};

// oscurecer color
const darken = (hex, amt = 30) => {
  const c = hex.replace("#", "");
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  r = Math.max(0, r - amt);
  g = Math.max(0, g - amt);
  b = Math.max(0, b - amt);
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// color de contraste
const getContrastColor = (hex) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

const SimpleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ==========================
  //  CARGAR RESERVAS
  // ==========================
  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from("reserva")
        .select(`
          *,
          Cliente:usuario!reserva_idusuariocliente_fkey ( nombre ),
          Empleado:usuario!reserva_idempleado_fkey ( nombre ),
          Servicio:servicio!reserva_idservicio_fkey ( nombreservicio )
        `);

      if (error) throw error;

      const formatted = (data || []).map((r) => {
        let bg = "";
        let border = "";
        let text = "#fff";

        if (r.estado === "pendiente") {
          bg = getEventColorForEmployee(r.idempleado);
          border = darken(bg, 30);
          text = getContrastColor(bg);

        } else if (r.estado === "cancelada") {
          bg = COLOR_CANCELADA;
          border = darken(COLOR_CANCELADA, 40);
          text = "#ffffff";

        } else if (r.estado === "realizada") {
          bg = COLOR_REALIZADA;
          border = darken(COLOR_REALIZADA, 40);
          text = "#ffffff";

        } else {
          bg = getEventColorForEmployee(r.idempleado);
          border = darken(bg, 30);
          text = getContrastColor(bg);
        }

        return {
          id: r.idreserva,
          title: `${r.Servicio?.nombreservicio ?? ""} - ${r.Cliente?.nombre ?? ""}`,
          start: `${r.fecha}T${r.hora}`,
          backgroundColor: bg,
          borderColor: border,
          textColor: text,
          extendedProps: {
            empleadoId: r.idempleado,
            empleadoName: r.Empleado?.nombre ?? null,
            clienteName: r.Cliente?.nombre ?? null,
            servicioName: r.Servicio?.nombreservicio ?? null,
            estado: r.estado ?? null,
            raw: r,
          },
        };
      });

      setEvents(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================
  //   CLICK EN EVENTO
  // ==========================
  const handleEventClick = (clickInfo) => {
    const ev = clickInfo.event;
    const props = ev.extendedProps || {};
    setSelectedEvent({
      id: ev.id,
      title: ev.title,
      start: ev.start ? ev.start.toISOString() : ev.startStr,
      empleadoId: props.empleadoId,
      empleadoName: props.empleadoName,
      clienteName: props.clienteName,
      servicioName: props.servicioName,
      estado: props.estado,
      raw: props.raw,
    });
  };

  // ==========================
  //   ACTUALIZAR ESTADO
  // ==========================
  const updateReservationStatus = async (idReserva, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from("reserva")
        .update({ estado: nuevoEstado })
        .eq("idreserva", idReserva);

      if (error) {
        console.error("Error al actualizar estado:", error);
        return;
      }

      await fetchReservations();
      setSelectedEvent(null);
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  };

  const toolbarColor = COMPANY_PALETTE[0];
  const toolbarHover = COMPANY_PALETTE[1] || toolbarColor;

  return (
    <div className="p-4 bg-white rounded shadow relative">

      {/* Animación */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      {/* Estilos del calendario */}
      <style>{`
        .fc .fc-toolbar .fc-button {
          background-color: ${toolbarColor} !important;
          border-color: ${toolbarColor} !important;
          color: ${getContrastColor(toolbarColor)} !important;
        }
        .fc .fc-toolbar .fc-button:hover {
          background-color: ${toolbarHover} !important;
        }
        .fc .fc-toolbar-title {
          color: ${toolbarColor} !important;
          font-weight: 600;
        }
      `}</style>

      {/* CALENDARIO */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventDisplay="block"
        dayMaxEventRows={4}
        height="auto"
        eventClick={handleEventClick}
      />

      {/* PANEL */}
      {selectedEvent && (
        <div className="absolute top-6 right-6 z-50 w-80 bg-white border rounded shadow-lg p-4 animate-fadeIn">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-sm">
                {selectedEvent.servicioName ?? selectedEvent.title}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(selectedEvent.start).toLocaleString()}
              </p>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedEvent(null)}
            >
              ✕
            </button>
          </div>

          <div className="text-sm space-y-1 mb-3">
            <p><strong>Empleado:</strong> {selectedEvent.empleadoName}</p>
            <p><strong>Cliente:</strong> {selectedEvent.clienteName}</p>
            <p><strong>Estado:</strong> {selectedEvent.estado}</p>
          </div>

          {/* SI ESTÁ CANCELADA → mensaje */}
          {selectedEvent.estado === "cancelada" && (
            <p className="text-red-600 font-semibold text-center">
              Reserva cancelada
            </p>
          )}

          {/* BOTONES SI NO ESTÁ CANCELADA */}
          {selectedEvent.estado !== "cancelada" && (
            <div className="flex flex-col gap-2">

              <button
                onClick={() =>
                  updateReservationStatus(selectedEvent.id, "realizada")
                }
                className="w-full py-1 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Marcar como Realizada
              </button>

              <button
                onClick={() =>
                  updateReservationStatus(selectedEvent.id, "cancelada")
                }
                className="w-full py-1 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Cancelar Reserva
              </button>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleCalendar;

