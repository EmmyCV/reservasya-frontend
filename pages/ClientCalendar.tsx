import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

// === PALETA CORPORATIVA ===
const COMPANY_PALETTE = [
  "#A35C58",
  "#D8AFA7",
  "#D2B4A3",
  "#8C847E",
  "#F0E0D4",
  "#FCF8F5",
];

// === PALETA DE EVENTOS ===
const EVENT_PALETTE = [
  "#FF9B8D",
  "#A95E73",
  "#D8AFA7",
  "#7FD0E2",
  "#73A954",
  "#73A956",
  "#5E7349",
];

// === FUNCIONES DE COLOR ===
const getEventColorForEmployee = (id: any) => {
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

const getContrastColor = (hex: string) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

const ClientCalendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    if (user) fetchReservations();
  }, [user]);

  // === CARGAR RESERVAS ===
  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from("reserva")
      .select(`
        *,
        Empleado:usuario!reserva_idempleado_fkey ( nombre ),
        Servicio:servicio!reserva_idservicio_fkey ( nombreservicio )
      `)
      .eq("idusuariocliente", user.id);

    if (error) {
      console.error("Error cargando reservas cliente:", error);
      return;
    }

    const formatted = (data || [])
      .filter((r: any) => r.estado !== "cancelada")
      .map((r: any) => {
        const color = getEventColorForEmployee(r.idempleado);
        return {
          id: r.idreserva,
          title: r.Servicio?.nombreservicio ?? "Servicio",
          start: `${r.fecha}T${r.hora}`,
          backgroundColor: color,
          borderColor: darken(color),
          textColor: getContrastColor(color),
          extendedProps: {
            empleado: r.Empleado?.nombre ?? "Sin asignar",
            estado: r.estado,
          },
        };
      });

    setEvents(formatted);
  };

  // === CANCELAR RESERVA (CORREGIDO — idreserva es UUID STRING) ===
  const cancelReservation = async (reservationId: string) => {
    console.log("Cancelando ID:", reservationId);

    const { error } = await supabase
      .from("reserva")
      .update({ estado: "cancelada" })
      .eq("idreserva", reservationId);

    if (error) {
      console.error("Error cancelando reserva:", error);
      alert("Error al cancelar la reserva.");
      return;
    }

    alert("Reserva cancelada correctamente.");

    // Quitarla del calendario visual
    setEvents((prev) => prev.filter((e) => e.id !== reservationId));

    // Cerrar modal
    setSelectedEvent(null);
  };

  const toolbarColor = COMPANY_PALETTE[0];
  const toolbarHover = COMPANY_PALETTE[1] || toolbarColor;

  return (
    <div className="p-4 bg-white rounded shadow relative">
      <style>{`
        .fc .fc-toolbar .fc-button {
          background-color: ${toolbarColor} !important;
          border-color: ${toolbarColor} !important;
          color: ${getContrastColor(toolbarColor)} !important;
        }
        .fc .fc-toolbar .fc-button:hover,
        .fc .fc-toolbar .fc-button:focus {
          background-color: ${toolbarHover} !important;
          border-color: ${toolbarHover} !important;
          color: ${getContrastColor(toolbarHover)} !important;
        }
        .fc .fc-toolbar .fc-button.fc-button-active {
          background-color: ${toolbarHover} !important;
          border-color: ${toolbarHover} !important;
          color: ${getContrastColor(toolbarHover)} !important;
        }
        .fc .fc-toolbar-title {
          color: ${toolbarColor} !important;
          font-weight: 600;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(163,92,88,0.06) !important;
        }
        .fc .fc-daygrid-day-frame {
          padding: 4px !important;
          overflow: hidden !important;
        }
        .fc .fc-daygrid-day-events {
          max-height: calc(100% - 28px) !important;
          overflow: hidden !important;
        }
        .fc .fc-daygrid-event {
          display: block !important;
          width: calc(100% - 6px) !important;
          max-width: 100% !important;
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
        eventClick={(info) => setSelectedEvent(info.event)}
      />

      {/* === MODAL ANIMADO === */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded shadow-lg w-80"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h3 className="font-semibold text-lg mb-2">
                {selectedEvent.title}
              </h3>

              <p className="text-sm text-gray-700 mb-1">
                Fecha y hora:<br />
                {new Date(selectedEvent.startStr).toLocaleString()}
              </p>

              <p className="text-sm">
                <strong>Empleado:</strong> {selectedEvent.extendedProps.empleado}
              </p>

              <p className="text-sm mb-4">
                <strong>Estado:</strong> {selectedEvent.extendedProps.estado}
              </p>

              {selectedEvent.extendedProps.estado !== "cancelado" && (
                <button
                  className="w-full bg-red-600 text-white px-3 py-2 text-sm rounded mb-3"
                  onClick={() => cancelReservation(selectedEvent.id)}
                >
                  Cancelar Reserva
                </button>
              )}

              <button
                className="w-full bg-gray-500 text-white px-3 py-2 text-sm rounded"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientCalendar;
