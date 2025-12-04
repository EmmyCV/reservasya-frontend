import React, { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { supabase } from "../services/supabase";
import { Servicio } from "../types";
import { useAuth } from "../contexts/AuthContext";
// Componente HourPicker original del usuario
import HourPicker from "./HourPicker"; 

interface Props {
  service: Servicio | null;
  onClose: () => void;
}

const SUCCESS_GREEN = "#73A954"; // Color verde definido
const SUCCESS_LIGHT = "#99bf7a"; // Un verde un poco más claro para el hover/días disponibles

// --- Funciones de Utilidad ---

const darken = (hex: string, amt = 18) => {
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

// --- Componente Principal ---

const ImageBookingFlow: React.FC<Props> = ({ service, onClose }) => {
  if (!service) return null;
  const { user } = useAuth();
  const calendarRef = useRef<any>(null);

  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica de arrastre (drag-to-close) - Mantenida para la interacción
  const startY = useRef<number | null>(null);
  const dragY = useRef(0);
  const [translateY, setTranslateY] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setTranslateY(0);
      setIsOpen(true);
    });
  }, []);

  const closeWithAnimation = () => {
    setTranslateY(100);
    setTimeout(() => onClose(), 300);
  };

  const startDrag = (y: number) => {
    startY.current = y;
    setIsDragging(true);
  };

  const moveDrag = (y: number) => {
    if (startY.current === null) return;
    const delta = y - startY.current;
    dragY.current = delta;
    if (delta <= 0) return setTranslateY(0);
    const pct = Math.min(100, (delta / window.innerHeight) * 100);
    setTranslateY(pct);
  };

  const endDrag = () => {
    setIsDragging(false);
    if (dragY.current > 120) closeWithAnimation();
    else setTranslateY(0);
    startY.current = null;
    dragY.current = 0;
  };
  // Fin de la lógica de arrastre

  // Carga de empleados (mantenida del código original)
  useEffect(() => {
    const loadEmployees = async () => {
      if (!service?.idServicio) return;
      try {
        const { data, error } = await supabase
          .from("empleado_servicio")
          .select(`idusuarioempleado, disponible, usuario (id, nombre)`)
          .eq("idservicio", service.idServicio);

        if (error) {
          console.error("Error carga especialistas:", error);
          setEmployees([]);
          return;
        }

        const resultado: any[] = [];
        const usados = new Set<string>();
        (data || []).forEach((item: any) => {
          if (!item.disponible) return;
          const usuario = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
          if (!usuario) return;
          if (!usados.has(String(usuario.id))) {
            resultado.push({
              id: usuario.id,
              nombre: usuario.nombre,
            });
            usados.add(String(usuario.id));
          }
        });
        setEmployees(resultado);
      } catch (e) {
        console.error(e);
        setEmployees([]);
      }
    };
    loadEmployees();
  }, [service]);

  // Manejo de clic en el calendario
  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setSelectedHour(null); // Resetear la hora al cambiar de fecha
    setStep(3);
  };

  // Función MOCK para simular los días que tienen al menos 1 hora libre
  // NOTA: En producción, esta función debería usar un RPC de Supabase para verificar disponibilidad real.
  const fetchAvailableDaysMock = (fetchInfo: any, successCallback: any) => {
    if (!selectedEmployee || !service) return successCallback([]);

    const startDate = new Date(fetchInfo.startStr);
    const endDate = new Date(fetchInfo.endStr);
    
    const availableEvents: any[] = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Simulación: Los días 3, 4, 10, 15 y 20 de cualquier mes tienen disponibilidad
        const dayOfMonth = currentDate.getDate();
        // Aseguramos que la fecha no sea pasada
        if ([3, 4, 10, 15, 20].includes(dayOfMonth) && currentDate >= new Date(new Date().setHours(0,0,0,0))) {
            availableEvents.push({
                start: dateStr,
                display: 'background',
                color: SUCCESS_LIGHT, // Fondo verde claro para indicar disponibilidad
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    successCallback(availableEvents);
  };

  // Lógica de confirmación de reserva (mantenida del código original)
  const handleConfirm = async () => {
    setError(null);
    if (!user || !selectedEmployee || !selectedDate || !selectedHour) {
      return setError("Completa especialista, fecha y hora.");
    }
    setLoading(true);

    try {
      const horaInicio = `${selectedHour}:00`;
      const duracion = Math.ceil((service.duracion ?? 60) / 60);

      // Lógica de verificación y reserva
      const { data: reservas } = await supabase
        .from("reserva")
        .select("hora")
        .eq("idempleado", selectedEmployee.id)
        .eq("fecha", selectedDate);

      const horasOcupadas = reservas?.map((r: any) => parseInt(r.hora.split(":")[0])) || [];
      const inicio = parseInt(selectedHour.split(':')[0]);

      for (let i = 0; i < duracion; i++) {
        if (horasOcupadas.includes(inicio + i)) {
          setError("Ese horario ya está ocupado.");
          setLoading(false);
          return;
        }
      }

      const { error: insertError } = await supabase.from("reserva").insert({
        idusuariocliente: user.id,
        idempleado: selectedEmployee.id,
        idservicio: service.idServicio,
        fecha: selectedDate,
        hora: horaInicio,
        estado: "pendiente",
        disponible: false,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setStep(5);
    } catch (e) {
      console.error("Error creando reserva:", e);
      setError("No se pudo crear la reserva.");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        onClick={closeWithAnimation}
        className="absolute inset-0 bg-black transition-opacity"
        style={{ opacity: isOpen && translateY === 0 ? 0.4 : 0, pointerEvents: isOpen ? "auto" : "none" }}
      />
      <div
        onTouchStart={(e) => startDrag(e.touches[0].clientY)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientY)}
        onTouchEnd={endDrag}
        onMouseDown={(e) => startDrag(e.clientY)}
        onMouseMove={(e) => isDragging && moveDrag(e.clientY)}
        onMouseUp={endDrag}
        className="relative w-full max-w-4xl bg-white rounded-t-xl shadow-xl"
        style={{
          transform: `translateY(${translateY}%)`,
          transition: isDragging ? "none" : "transform 260ms ease-out",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="w-full flex justify-center py-2">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-semibold">Agendar: {service.nombre}</h3>
            <button onClick={closeWithAnimation}>✕</button>
          </div>

          {/* === PASO 1: Elegir especialista === */}
          {step === 1 && (
            <>
              <p className="text-sm text-gray-600 mb-4">1. Elige especialista</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 text-xl">
                        👤
                      </div>
                      <div>
                        <p className="font-medium">{emp.nombre}</p>
                        <p className="text-xs text-gray-500">Especialista</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setStep(2);
                      }}
                      className="px-3 py-2 rounded"
                      style={{ background: SUCCESS_GREEN, color: getContrastColor(SUCCESS_GREEN), borderColor: darken(SUCCESS_GREEN) }}
                    >
                      Seleccionar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* === PASO 2: Calendario y Fecha === */}
          {step === 2 && selectedEmployee && (
            <>
              <p className="text-sm text-gray-600 mb-4">2. Selecciona una **fecha disponible** con {selectedEmployee.nombre}</p>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 booking-calendar-override">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    dateClick={handleDateClick}
                    validRange={{ start: new Date().toISOString().split("T")[0] }}
                    height="auto"
                    // Configuración para el header con estilo de imagen
                    headerToolbar={{
                        left: 'prev',
                        center: 'title',
                        right: 'next'
                    }}
                    customButtons={{
                        prev: {
                            text: '< Prev Month',
                            click: () => calendarRef.current?.getApi().prev()
                        },
                        next: {
                            text: 'Next Month >',
                            click: () => calendarRef.current?.getApi().next()
                        }
                    }}
                    // Días disponibles pintados en verde claro
                    eventSources={[{
                        events: fetchAvailableDaysMock, 
                    }]}
                    eventDisplay="background" 
                    dayMaxEvents={true}
                    // Estilizado de los días de la semana
                    dayHeaderContent={(arg) => {
                        return (
                            <div className="text-xs uppercase font-medium text-center">
                                {arg.text}
                            </div>
                        );
                    }}
                    // Estilizado del número de día (resalta el seleccionado en verde oscuro)
                    dayCellContent={(arg) => {
                        const dateStr = arg.date.toISOString().split('T')[0];
                        const isSelected = dateStr === selectedDate;
                        
                        return (
                            <div
                                className={`text-center py-2 font-medium cursor-pointer transition-colors ${
                                    isSelected 
                                    ? 'bg-current text-white rounded-md' 
                                    : 'hover:bg-gray-100 rounded-md'
                                }`}
                                style={{
                                    backgroundColor: isSelected ? SUCCESS_GREEN : 'transparent',
                                    color: isSelected ? 'white' : 'inherit'
                                }}
                            >
                                {arg.dayNumberText}
                            </div>
                        );
                    }}
                    titleFormat={{ year: 'numeric', month: 'long' }}
                  />
                </div>
                <div className="md:w-80 mt-4 md:mt-0">
                  <button onClick={() => setStep(1)} className="text-sm text-gray-600 underline">
                    ← Cambiar especialista
                  </button>
                </div>
              </div>
            </>
          )}

          {/* === PASO 3: Selección de Hora (Usando HourPicker.tsx) === */}
          {step === 3 && selectedEmployee && selectedDate && (
            <>
              <p className="text-sm text-gray-600 mb-4">3. Selecciona una hora</p>
              <HourPicker
                idEmpleado={String(selectedEmployee.id)}
                fecha={selectedDate}
                idservicio={service.idServicio}
                duracionServicio={Math.ceil((service.duracion ?? 60) / 60)}
                selectedHora={selectedHour || undefined}
                onSelectHora={(h) => {
                  setSelectedHour(h);
                  setStep(4);
                }}
                // Pasamos los colores al componente HourPicker para que pinte los disponibles en verde
                
                
              />
              <button onClick={() => setStep(2)} className="mt-4 underline text-sm">
                ← Cambiar fecha
              </button>
            </>
          )}

          {/* === PASO 4: Confirmar === */}
          {step >= 4 && selectedHour && (
            <>
              <p className="text-sm text-gray-600 mb-4">4. Confirmar</p>
              <div className="p-4 border bg-gray-50 rounded">
                <p><strong>Servicio:</strong> {service.nombre}</p>
                <p><strong>Especialista:</strong> {selectedEmployee?.nombre}</p>
                <p><strong>Fecha:</strong> {selectedDate}</p>
                <p><strong>Hora:</strong> {selectedHour}</p>
                {error && <p className="text-red-500 mt-2">{error}</p>}
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button onClick={() => setStep(3)} className="px-3 py-2 rounded border">
                    ← Cambiar hora
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="px-4 py-2 rounded"
                    style={{ background: SUCCESS_GREEN, color: getContrastColor(SUCCESS_GREEN) }}
                  >
                    {loading ? "Guardando..." : "Confirmar reserva"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* === PASO 5: Éxito === */}
          {step === 5 && success && (
            <div className="text-center p-6">
              <h4 className="text-xl font-semibold" style={{ color: SUCCESS_GREEN }}>
                ¡Reserva creada!
              </h4>
              <p className="mt-2">
                Tu reserva para <strong>{service.nombre}</strong> con <strong>{selectedEmployee?.nombre}</strong> el <strong>{selectedDate}</strong> a las <strong>{selectedHour}</strong> fue registrada.
              </p>
              <button
                onClick={closeWithAnimation}
                className="mt-4 px-4 py-2 rounded"
                style={{ background: SUCCESS_GREEN, color: getContrastColor(SUCCESS_GREEN) }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageBookingFlow;