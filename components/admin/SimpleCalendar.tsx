import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../services/supabase";

// 🎨 Paleta de la empresa (tomada del adjunto). A35C58 es el acento principal.
const COMPANY_PALETTE = [
  "#A35C58", // acento principal
  "#D8AFA7",
  "#D2B4A3",
  "#8C847E",
  "#F0E0D4",
  "#FCF8F5",
];

// Nueva paleta de eventos: rosados / corales pastel pero saturados
const EVENT_PALETTE = [
  "#FF5E72", // coral fuerte
  "#FF7A95", // rosa coral
  "#FF6B8A",
  "#FF8FA3",
  "#FF4D6D",
  "#F973A8",
];

// Deterministic color per employee id using la paleta de eventos
const getEventColorForEmployee = (id: any) => {
  if (!id) return EVENT_PALETTE[0];
  const s = String(id);
  // simple hash
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % EVENT_PALETTE.length;
  return EVENT_PALETTE[idx];
};

// utility: oscurecer color para border (resta valor fijo)
const darken = (hex: string, amt = 30) => {
  const c = hex.replace("#", "");
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  r = Math.max(0, r - amt);
  g = Math.max(0, g - amt);
  b = Math.max(0, b - amt);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// luminance-based contrast: returns '#000' for light bg, '#fff' for dark bg
const getContrastColor = (hex: string) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

const SimpleCalendar: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [employeeColors, setEmployeeColors] = useState({});
  // nuevo estado para la reserva seleccionada
  const [selectedEvent, setSelectedEvent] = useState<null | {
    id: any;
    title: string;
    start: string;
    empleadoId?: any;
    empleadoName?: string;
    clienteName?: string;
    servicioName?: string;
    estado?: string;
    raw?: any;
  }>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      // 📌 Relaciones corregidas segun FKs reales
      const { data, error } = await supabase
        .from("reserva")
        .select(`
          *,
          Cliente:usuario!reserva_idusuariocliente_fkey ( nombre ),
          Empleado:usuario!reserva_idempleado_fkey ( nombre ),
          Servicio:servicio!reserva_idservicio_fkey ( nombreservicio )
        `);

      if (error) throw error;

      const formatted = (data || []).map((r: any) => {
        const color = getEventColorForEmployee(r.idempleado);
        return {
          id: r.idreserva,
          title: `${r.Servicio?.nombreservicio ?? ""} - ${r.Cliente?.nombre ?? ""}`,
          start: `${r.fecha}T${r.hora}`,
          backgroundColor: color,
          borderColor: darken(color, 30),
          textColor: getContrastColor(color),
          // extendedProps para usar en eventClick
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

      setEmployeeColors({});
      setEvents(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  // nuevo handler para click en evento
  const handleEventClick = (clickInfo: any) => {
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

  const toolbarColor = COMPANY_PALETTE[0];
  const toolbarHover = COMPANY_PALETTE[1] || toolbarColor;

  return (
    <div className="p-4 bg-white rounded shadow relative">
      {/* estilos inyectados para sobreescribir el header de FullCalendar */}
      <style>{`
        /* toolbar buttons */
        .fc .fc-toolbar .fc-button {
          background-color: ${toolbarColor} !important;
          border-color: ${toolbarColor} !important;
          color: ${getContrastColor(toolbarColor)} !important;
        }
        /* hover / focus */
        .fc .fc-toolbar .fc-button:hover,
        .fc .fc-toolbar .fc-button:focus {
          background-color: ${toolbarHover} !important;
          border-color: ${toolbarHover} !important;
          color: ${getContrastColor(toolbarHover)} !important;
          box-shadow: none !important;
        }
        /* active button (today / view buttons) */
        .fc .fc-toolbar .fc-button.fc-button-active {
          background-color: ${toolbarHover} !important;
          border-color: ${toolbarHover} !important;
          color: ${getContrastColor(toolbarHover)} !important;
        }
        /* título del calendario */
        .fc .fc-toolbar-title {
          color: ${toolbarColor} !important;
          font-weight: 600;
        }
        /* hoy resaltado (si aplica) */
        .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(163,92,88,0.06) !important;
        }

        /* Contenedor de eventos en la celda: evitar que se salga */
        .fc .fc-daygrid-day-frame {
          padding: 4px !important;
          overflow: hidden !important; /* evita overflow fuera de la celda */
        }

        /* limitar la zona que contiene eventos y permitir que los eventos no sobresalgan */
        .fc .fc-daygrid-day-events {
          max-height: calc(100% - 28px) !important;
          overflow: hidden !important;
        }

        /* Estilos para que los eventos en month view se vean como 'pills' y no salgan */
        .fc .fc-daygrid-event {
          display: block !important;
          width: calc(100% - 6px) !important; /* dejar pequeño padding interno */
          max-width: 100% !important;
          box-sizing: border-box !important;
          border-radius: 9999px !important;
          padding: 0.15rem 0.5rem !important;
          margin: 2px 0 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
          font-size: 0.85rem !important;
        }

        /* Asegurar que el contenido del evento ocupe todo el pill y recorte texto */
        .fc .fc-daygrid-event .fc-event-main-frame,
        .fc .fc-daygrid-event a {
          display: block !important;
          width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          color: inherit !important;
        }

        /* si hay muchos eventos, FullCalendar mostrará "+N more" en su propio botón; asegurar que no desborde */
        .fc .fc-daygrid-more-link {
          display: inline-block;
          width: 100%;
          box-sizing: border-box;
          padding: 2px 4px;
          font-size: 0.8rem;
          text-align: left;
        }
      `}</style>

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
        eventClick={handleEventClick} /* añadido */
      />

      {/* Panel de detalle simple */}
      {selectedEvent && (
        <div className="absolute top-6 right-6 z-50 w-80 bg-white border rounded shadow-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-sm">{selectedEvent.servicioName ?? selectedEvent.title}</h3>
              <p className="text-xs text-gray-500">{new Date(selectedEvent.start).toLocaleString()}</p>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedEvent(null)}
              aria-label="Cerrar detalle"
            >
              ✕
            </button>
          </div>

          <div className="text-sm space-y-1">
            <p><strong>Empleado:</strong> {selectedEvent.empleadoName ?? selectedEvent.empleadoId ?? "Sin asignar"}</p>
            <p><strong>Cliente:</strong> {selectedEvent.clienteName ?? "Desconocido"}</p>
            <p><strong>Estado:</strong> {selectedEvent.estado ?? "—"}</p>
          </div>

          {/* opcional: mostrar payload raw para debugging */}
          {/* <pre className="text-xs mt-2 max-h-32 overflow-auto">{JSON.stringify(selectedEvent.raw, null, 2)}</pre> */}
        </div>
      )}
    </div>
  );
};

export default SimpleCalendar;
