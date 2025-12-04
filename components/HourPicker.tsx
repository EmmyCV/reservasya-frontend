import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface Props {
  idEmpleado: string;
  fecha: string;
  idservicio: number;
  duracionServicio: number; // en horas
  selectedHora?: string;
  onSelectHora: (hora: string) => void;
  showDebug?: boolean;
}

const SELECTED_GREEN = "#73A954";
const UNSELECTED_LIGHT = "#A8D58C";

const getContrastColor = (hex: string): string => {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

interface DebugData {
  reservas: Array<{ hora: string; estado: string }>;
  turno: any;
}

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
  const [debugData, setDebugData] = useState<DebugData>({ reservas: [], turno: null });

  useEffect(() => {
    if (fecha && idEmpleado) cargarHoras();
  }, [fecha, idEmpleado]);

  const cargarHoras = async () => {
    setLoading(true);
    setMensaje(null);

    // CORRECCIÓN DEL ERROR DEL MARTES POR ZONA HORARIA
    const localDate = new Date(fecha + "T00:00:00");
    const day = localDate.getDay(); // 1 = lunes

    if (day === 1) {
      setMensaje("No trabajamos los días lunes.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    try {
      // =========================================================
      // 1. OBTENER EL HORARIO DEL EMPLEADO
      // =========================================================
      const { data: empleadoHorario, error: err1 } = await supabase
        .from("empleado_horario")
        .select("idhorario, tipo_turno")
        .eq("idusuarioempleado", idEmpleado)
        .eq("activo", true)
        .single();

      if (err1 || !empleadoHorario) {
        setMensaje("El empleado no tiene horario asignado.");
        setHorasDisponibles([]);
        setLoading(false);
        return;
      }

      // =========================================================
      // 2. OBTENER HORAS DE LA TABLA HORARIO
      // =========================================================
      const { data: horario, error: err2 } = await supabase
        .from("horario")
        .select("horainicio, horafin")
        .eq("idhorario", empleadoHorario.idhorario)
        .single();

      if (err2 || !horario) {
        setMensaje("No se encontró la definición del horario.");
        setHorasDisponibles([]);
        setLoading(false);
        return;
      }

      const horaInicio = parseInt(horario.horainicio.split(":")[0]);
      const horaFin = parseInt(horario.horafin.split(":")[0]);

      // =========================================================
      // 3. OBTENER RESERVAS QUE BLOQUEAN HORAS
      // =========================================================
      const { data: reservas } = await supabase
        .from("reserva")
        .select("hora, estado")
        .eq("idempleado", idEmpleado)
        .eq("fecha", fecha)
        .in("estado", ["pendiente", "realizada"]);

      const ocupadas: number[] = [];

      for (const r of reservas ?? []) {
        const rh = parseInt(r.hora.split(":")[0]); // "13:00:00" → 13
        for (let i = 0; i < duracionServicio; i++) {
          ocupadas.push(rh + i);
        }
      }

      // =========================================================
      // 4. GENERAR HORAS DISPONIBLES CORRECTAMENTE
      // =========================================================
      const libres: string[] = [];
      for (let h = horaInicio; h + duracionServicio <= horaFin; h++) {
        let libre = true;

        for (let i = 0; i < duracionServicio; i++) {
          if (ocupadas.includes(h + i)) {
            libre = false;
            break;
          }
        }

        if (libre) libres.push(`${String(h).padStart(2, "0")}:00`);
      }

      if (!libres.length) {
        setMensaje("No hay horarios disponibles.");
      }

      setHorasDisponibles(libres);
      setDebugData({ reservas: reservas ?? [], turno: empleadoHorario });
    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar horarios.");
      setHorasDisponibles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Cargando horarios...</p>;
  if (mensaje) return <p className="text-red-600">{mensaje}</p>;

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {horasDisponibles.map((hora) => {
        const isSelected = selectedHora === hora;
        const bg = isSelected ? SELECTED_GREEN : UNSELECTED_LIGHT;

        return (
          <button
            key={hora}
            onClick={() => onSelectHora(hora)}
            style={{ backgroundColor: bg, color: getContrastColor(bg) }}
            className="px-3 py-2 rounded-lg transition focus:outline-none"
          >
            {hora}
          </button>
        );
      })}

      {showDebug && (
        <pre className="col-span-3 mt-2 p-2 bg-gray-50 border rounded text-xs max-h-40 overflow-auto">
          {JSON.stringify(debugData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default HourPicker;
