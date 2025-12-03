import React, { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { supabase } from "../services/supabase";
import { Servicio } from "../types";
import { useAuth } from "../contexts/AuthContext";
import HourPicker from "./HourPicker";

/* -------------------------------------
   PROPS
-------------------------------------- */
interface Props {
    service: Servicio | null;
    onClose: () => void;
}

/* -------------------------------------
   COLORS
-------------------------------------- */
const SUCCESS_GREEN = "#73A954";

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

/* -------------------------------------
   COMPONENTE PRINCIPAL
-------------------------------------- */
const ImageBookingFlow: React.FC<Props> = ({ service, onClose }) => {
    if (!service) return null;

    const { user } = useAuth();

    /* -------------------------------------
        STATE
    -------------------------------------- */
    const [step, setStep] = useState(1);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedHour, setSelectedHour] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* -------------------------------------
        DRAG SHEET
    -------------------------------------- */
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

    /* -------------------------------------
        LOAD EMPLOYEES (MISMA CONSULTA DE BOOKINGMODAL) - no solicitar 'foto'
    -------------------------------------- */
    useEffect(() => {
        const loadEmployees = async () => {
            if (!service?.idServicio) return;

            try {
                const { data, error } = await supabase
                    .from("empleado_servicio")
                    .select(`
            idusuarioempleado,
            usuario (
              id,
              nombre
            )
          `)
                    .eq("idservicio", service.idServicio);

                if (error) {
                    console.error("Error carga especialistas:", error);
                    setEmployees([]);
                    return;
                }

                const resultado: any[] = [];
                const usados = new Set<string>();

                (data || []).forEach((item: any) => {
                    const usuario = Array.isArray(item.usuario)
                        ? item.usuario[0]
                        : item.usuario;

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

    /* -------------------------------------
        DATE CLICK
    -------------------------------------- */
    const handleDateClick = (arg: any) => {
        setSelectedDate(arg.dateStr);
        setStep(3);
    };

    /* -------------------------------------
        CONFIRMAR RESERVA
    -------------------------------------- */
    const handleConfirm = async () => {
        setError(null);

        if (!user || !selectedEmployee || !selectedDate || !selectedHour) {
            return setError("Completa especialista, fecha y hora.");
        }

        setLoading(true);

        try {
            const horaInicio = `${selectedHour}:00`;
            const duracion = Math.ceil((service.duracion ?? 60) / 60);

            const { data: reservas } = await supabase
                .from("reserva")
                .select("hora")
                .eq("idempleado", selectedEmployee.id)
                .eq("fecha", selectedDate);

            const horasOcupadas =
                reservas?.map((r: any) => parseInt(r.hora.split(":")[0])) || [];

            const inicio = parseInt(selectedHour);

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

    /* -------------------------------------
        RENDER
    -------------------------------------- */
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                onClick={closeWithAnimation}
                className="absolute inset-0 bg-black transition-opacity"
                style={{
                    opacity: isOpen && translateY === 0 ? 0.4 : 0,
                    pointerEvents: isOpen ? "auto" : "none",
                }}
            />

            {/* Bottom Sheet */}
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
                {/* Handle */}
                <div className="w-full flex justify-center py-2">
                    <div className="w-10 h-1.5 rounded-full bg-gray-300" />
                </div>

                {/* CONTENT */}
                <div className="p-4">
                    <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-semibold">Agendar: {service.nombre}</h3>
                        <button onClick={closeWithAnimation}>✕</button>
                    </div>

                    {/* STEP 1: seleccionar especialista */}
                    {step === 1 && (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                1. Elige especialista
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {employees.map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="flex items-center justify-between p-3 border rounded"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Avatar genérico */}
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
                                            style={{
                                                background: SUCCESS_GREEN,
                                                color: getContrastColor(SUCCESS_GREEN),
                                                borderColor: darken(SUCCESS_GREEN),
                                            }}
                                        >
                                            Seleccionar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* STEP 2: seleccionar fecha */}
                    {step === 2 && selectedEmployee && (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                2. Selecciona una fecha con {selectedEmployee.nombre}
                            </p>

                            <div className="md:flex gap-4">
                                <div className="md:flex-1">
                                    <FullCalendar
                                        plugins={[dayGridPlugin]}
                                        initialView="dayGridMonth"
                                        dateClick={handleDateClick}
                                        validRange={{
                                            start: new Date().toISOString().split("T")[0],
                                        }}
                                        height="auto"
                                    />
                                </div>

                                <div className="md:w-80 mt-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-sm text-gray-600 underline"
                                    >
                                        ← Cambiar especialista
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* STEP 3: seleccionar hora */}
                    {step === 3 && selectedEmployee && selectedDate && (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                3. Selecciona una hora
                            </p>

                            <HourPicker
                                idEmpleado={String(selectedEmployee.id)}
                                fecha={selectedDate}
                                idservicio={service.idServicio}
                                duracionServicio={Math.ceil(
                                    (service.duracion ?? 60) / 60
                                )}
                                selectedHora={selectedHour || undefined}
                                onSelectHora={(h) => {
                                    setSelectedHour(h);
                                    setStep(4);
                                }}
                            />

                            <button
                                onClick={() => setStep(2)}
                                className="mt-4 underline text-sm"
                            >
                                ← Cambiar fecha
                            </button>
                        </>
                    )}

                    {/* STEP 4: confirmar */}
                    {step >= 4 && selectedHour && (
                        <>
                            <p className="text-sm text-gray-600 mb-4">4. Confirmar</p>

                            <div className="p-4 border bg-gray-50 rounded">
                                <p>
                                    <strong>Servicio:</strong> {service.nombre}
                                </p>
                                <p>
                                    <strong>Especialista:</strong>{" "}
                                    {selectedEmployee?.nombre}
                                </p>
                                <p>
                                    <strong>Fecha:</strong> {selectedDate}
                                </p>
                                <p>
                                    <strong>Hora:</strong> {selectedHour}
                                </p>

                                {error && (
                                    <p className="text-red-500 mt-2">{error}</p>
                                )}

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="px-3 py-2 rounded border"
                                    >
                                        ← Cambiar hora
                                    </button>

                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="px-4 py-2 rounded"
                                        style={{
                                            background: SUCCESS_GREEN,
                                            color: getContrastColor(SUCCESS_GREEN),
                                        }}
                                    >
                                        {loading ? "Guardando..." : "Confirmar reserva"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* STEP 5: éxito */}
                    {step === 5 && success && (
                        <div className="text-center p-6">
                            <h4
                                className="text-xl font-semibold"
                                style={{ color: SUCCESS_GREEN }}
                            >
                                ¡Reserva creada!
                            </h4>

                            <p className="mt-2">
                                Tu reserva para <strong>{service.nombre}</strong>{" "}
                                con <strong>{selectedEmployee?.nombre}</strong> el{" "}
                                <strong>{selectedDate}</strong> a las{" "}
                                <strong>{selectedHour}</strong> fue registrada.
                            </p>

                            <button
                                onClick={closeWithAnimation}
                                className="mt-4 px-4 py-2 rounded"
                                style={{
                                    background: SUCCESS_GREEN,
                                    color: getContrastColor(SUCCESS_GREEN),
                                }}
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

