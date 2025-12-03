import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface Props {
  idEmpleado: string;
  fecha: string;
  idservicio: number;
  duracionServicio: number;
  selectedHora?: string;
  onSelectHora: (hora: string) => void;
  showDebug?: boolean;
}

const SELECTED_GREEN = "#73A954";
const UNSELECTED_LIGHT = "#A8D58C";

const getContrastColor = (hex: string) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

const HourPicker: React.FC<Props> = ({
  idEmpleado,
  fecha,
  duracionServicio,
  selectedHora,
  onSelectHora,
  showDebug,
}) => {
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [debugTurno, setDebugTurno] = useState<any[] | null>(null);
  const [debugReservas, setDebugReservas] = useState<any[] | null>(null);

  useEffect(() => {
    if (fecha && idEmpleado) cargarHoras();
  }, [fecha, idEmpleado]);

  const cargarHoras = async () => {
    setLoading(true);
    setMensaje(null);

    const day = new Date(fecha).getDay();
    if (day === 1) {
      setMensaje("No trabajamos los días lunes.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    // Obtener horario del empleado
    let turnoData: any[] = [];
    const { data: horarioEmpleado } = await supabase
      .from("empleado_horario")
      .select(`idhorario, horario(horainicio, horafin)`)
      .eq("idusuarioempleado", idEmpleado);

    if (horarioEmpleado) turnoData = horarioEmpleado;
    setDebugTurno(turnoData);

    if (!turnoData.length) {
      setMensaje("El empleado no tiene horario asignado.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    // Último horario asignado
    const ultimo = turnoData[turnoData.length - 1];
    const h = Array.isArray(ultimo.horario) ? ultimo.horario[0] : ultimo.horario;

    if (!h) {
      setMensaje("Horario inválido.");
      
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    const horaInicio = h.horainicio; // "09:00:00"
    const horaFin = h.horafin;       // "17:00:00"

    // Normalizar horarios a HH:MM
    const hi = horaInicio.substring(0, 5);
    const hf = horaFin.substring(0, 5);

    // Obtener reservas válidas (no canceladas)
    const { data: reservas } = await supabase
      .from("reserva")
      .select("hora, idservicio, estado")
      .eq("idempleado", idEmpleado)
      .eq("fecha", fecha)
      .neq("estado", "cancelada");

    setDebugReservas(reservas ?? []);

    // BLOQUEAR HORAS OCUPADAS
    const horasBloqueadas: string[] = [];

    for (const r of reservas ?? []) {
      const horaReserva = r.hora.substring(0, 5); // HH:MM
      const [rh, rm] = horaReserva.split(":").map(Number);
      const inicioReserva = rh * 60 + rm;

      const { data: servData } = await supabase
        .from("servicio")
        .select("duracion")
        .eq("idservicio", r.idservicio)
        .single();

      const duracionMin = servData?.duracion ?? 60;
      const finReserva = inicioReserva + duracionMin;

      // Cada reserva bloquea su intervalo
      const horaInicioBloque = Math.floor(inicioReserva / 60);
      const horaFinBloque = Math.ceil(finReserva / 60);

      for (let h = horaInicioBloque; h < horaFinBloque; h++) {
        horasBloqueadas.push(`${String(h).padStart(2, "0")}:00`);
      }
    }

    // Generar bloques disponibles
    const posibles = generarBloques(hi, hf, duracionServicio);

    const libres = posibles.filter((h) => !horasBloqueadas.includes(h));

    if (!libres.length) {
      setMensaje("No hay horarios disponibles.");
    }

    setHorasDisponibles(libres);
    setLoading(false);
  };

  const generarBloques = (inicio: string, fin: string, duracion: number): string[] => {
    const resultado: string[] = [];
    const hIni = parseInt(inicio.split(":")[0]);
    const hFin = parseInt(fin.split(":")[0]);

    for (let h = hIni; h + duracion <= hFin; h++) {
      resultado.push(`${String(h).padStart(2, "0")}:00`);
    }
    return resultado;
  };

  if (loading) return <p>Cargando horarios...</p>;
  if (mensaje) return <p className="text-red-600">{mensaje}</p>;

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {horasDisponibles.map((hora) => {
        const isSelected = selectedHora === hora;
        const bg = isSelected ? SELECTED_GREEN : UNSELECTED_LIGHT;
        const color = getContrastColor(bg);

        return (
          <button
            key={hora}
            onClick={() => onSelectHora(hora)}
            style={{
              backgroundColor: bg,
              color,
            }}
            className="px-3 py-2 rounded-lg transition focus:outline-none"
          >
            {hora}
          </button>
        );
      })}

      {showDebug && (
        <div className="col-span-3 mt-2 p-2 bg-gray-50 border rounded text-xs">
          <strong>Debug:</strong>
          <pre className="max-h-40 overflow-auto">
{JSON.stringify({ horasDisponibles, reservas: debugReservas, turno: debugTurno }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default HourPicker;
