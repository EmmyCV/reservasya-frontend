import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface Props {
  idEmpleado: string;
  fecha: string;
  idServicio: number;
  duracionServicio: number;
  selectedHora?: string;
  onSelectHora: (hora: string) => void;
  showDebug?: boolean;
}

const HourPicker: React.FC<Props> = ({
  idEmpleado,
  fecha,
  duracionServicio,
  selectedHora,
  onSelectHora,
  showDebug
}) => {
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [debugTurno, setDebugTurno] = useState<any[] | null>(null);
  const [debugReservas, setDebugReservas] = useState<any[] | null>(null);

  useEffect(() => {
    if (fecha && idEmpleado) cargarHoras();
  }, [fecha, idEmpleado]); // ✅ QUITAMOS duracionServicio

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

    // 1) obtener horario del empleado
    let turnoData: any[] = [];
    const { data } = await supabase
      .from("empleado_horario")
      .select(`idhorario, horario(horainicio, horafin)`)
      .eq("idusuarioempleado", idEmpleado);

    if (data) turnoData = data;

    setDebugTurno(turnoData);

    if (!turnoData.length) {
      setMensaje("El empleado no tiene horario asignado.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    const horario = Array.isArray(turnoData[0].horario)
      ? turnoData[0].horario[0]
      : turnoData[0].horario;

    const horaInicio = horario?.horainicio;
    const horaFin = horario?.horafin;

    if (!horaInicio || !horaFin) {
      setMensaje("Horario inválido.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    // 2) obtener reservas
    const { data: reservas } = await supabase
      .from("reserva")
      .select("hora, idservicio")
      .eq("idempleado", idEmpleado)
      .eq("fecha", fecha);

    setDebugReservas(reservas ?? []);

    const horasBloqueadas: string[] = [];

    for (const r of reservas ?? []) {
      const start = parseInt(r.hora.substring(0, 2));

      const { data: servData } = await supabase
        .from("servicio")
        .select("duracion")
        .eq("idServicio", r.idservicio)
        .single();

      const duracionReserva = Math.ceil((servData?.duracion ?? 60) / 60);

      for (let i = 0; i < duracionReserva; i++) {
        horasBloqueadas.push(`${String(start + i).padStart(2, "0")}:00`);
      }
    }

    // 3) generar bloques válidos
    const posibles = generarBloques(horaInicio, horaFin, duracionServicio);

    // 4) filtrar ocupados
    const libres = posibles.filter(h => !horasBloqueadas.includes(h));

    if (!libres.length) setMensaje("No hay horarios disponibles.");

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
      {horasDisponibles.map(hora => (
        <button
          key={hora}
          onClick={() => onSelectHora(hora)}
          className={`px-3 py-2 rounded-lg text-white transition
            ${selectedHora === hora ? "bg-pink-500" : "bg-pink-300 hover:bg-pink-400"}
          `}
        >
          {hora}
        </button>
      ))}

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
