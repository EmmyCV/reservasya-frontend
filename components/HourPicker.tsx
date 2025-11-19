import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface Props {
  idEmpleado: string;
  fecha: string; // yyyy-mm-dd
  idServicio: number;
  duracionServicio: number; // horas completas
  onSelectHora: (hora: string) => void;
  showDebug?: boolean;
}

const HourPicker: React.FC<Props> = ({ idEmpleado, fecha, duracionServicio, onSelectHora, showDebug }) => {
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [debugTurno, setDebugTurno] = useState<any[] | null>(null);
  const [debugReservas, setDebugReservas] = useState<any[] | null>(null);

  useEffect(() => {
    if (fecha) cargarHoras();
  }, [fecha, idEmpleado, duracionServicio]);

  const cargarHoras = async () => {
    setLoading(true);
    setMensaje(null);

    // ❌ Si el día es lunes, no trabajamos
    const day = new Date(fecha).getDay(); // 0=Domingo, 1=Lunes...
    if (day === 1) {
      setMensaje("No trabajamos los días lunes.");
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    // 1) Obtener horario(s) del empleado — más tolerante a nombres de columna y múltiples filas
    console.debug('[HourPicker] buscando empleado_horario para id=', idEmpleado, 'fecha=', fecha);
    let turnoData: any[] = [];
    try {
      const { data: rows1, error: err1 } = await supabase
        .from('empleado_horario')
        .select(`idhorario, horario(horainicio, horafin)`)
        .eq('idusuarioempleado', idEmpleado);
      if (err1) console.debug('[HourPicker] empleado_horario err (idusuarioempleado)', err1);
      if (rows1 && rows1.length) turnoData = rows1;

      // si no vino nada, intentar por otra posible columna `idempleado`
      if (!turnoData.length) {
        const { data: rows2, error: err2 } = await supabase
          .from('empleado_horario')
          .select(`idhorario, horario(horainicio, horafin)`)
          .eq('idempleado', idEmpleado);
        if (err2) console.debug('[HourPicker] empleado_horario err (idempleado)', err2);
        if (rows2 && rows2.length) turnoData = rows2;
      }
    } catch (e) {
      console.debug('[HourPicker] fallo consulta empleado_horario', e);
    }

    console.debug('[HourPicker] turnoData=', turnoData);
    setDebugTurno(turnoData.length ? turnoData : null);

    // Buscar la primera fila de horario válida (puede venir anidada o requerir fallback a tabla `horario`)
    const horarioRows: any[] = [];
    for (const row of turnoData) {
      if (row.horario) {
        const h = Array.isArray(row.horario) ? row.horario[0] : row.horario;
        horarioRows.push(h);
        continue;
      }
      if (row.idhorario) {
        try {
          const { data: hdata, error: herr } = await supabase
            .from('horario')
            .select('horainicio, horafin')
            .eq('idhorario', row.idhorario)
            .maybeSingle();
          if (!herr && hdata) horarioRows.push(hdata);
        } catch (e) {
          console.debug('[HourPicker] error fetch horario by idhorario', e);
        }
      }
    }

    if (!horarioRows.length) {
      setMensaje('El empleado no tiene horario asignado.');
      setHorasDisponibles([]);
      setLoading(false);
      return;
    }

    const h = horarioRows[0];
    // Accept multiple possible column namings
    const horaInicio = h?.horainicio ?? h?.horaInicio ?? h?.hora_inicio ?? '';
    const horaFin = h?.horafin ?? h?.horaFin ?? h?.hora_fin ?? '';

    // 2) Obtener reservas ya ocupadas
      const { data: reservas, error: reservasErr } = await supabase
        .from("reserva")
        .select("hora, duracion")
        .eq("idempleado", idEmpleado)
        .eq("fecha", fecha);
    if (reservasErr) console.debug('[HourPicker] error reservas', reservasErr);
    console.debug('[HourPicker] reservas=', reservas);
    setDebugReservas(reservas ?? null);

    // 3) Generar bloques posibles
    const posibles = generarBloques(horaInicio, horaFin, duracionServicio);

    // 4) Excluir ocupadas
    const ocupadas = reservas?.map(r => r.hora) ?? [];
    const libres = posibles.filter(h => !ocupadas.includes(h));

    if (!libres.length) setMensaje("No hay horario disponible");

    setHorasDisponibles(libres);
    setLoading(false);
  };

  /**
   * Generar bloques de horas
   */
  const generarBloques = (inicio: string, fin: string, horasServicio: number): string[] => {
    let resultado: string[] = [];
    let hIni = parseInt(inicio.split(":")[0]);
    let hFin = parseInt(fin.split(":")[0]);

    for (let h = hIni; h + horasServicio <= hFin; h++) {
      resultado.push(`${h.toString().padStart(2, "0")}:00`);
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
          className="px-3 py-2 bg-pink-300 text-white rounded-lg hover:bg-pink-400"
        >
          {hora}
        </button>
      ))}
      {/* Debug output */}
      { showDebug && (
        <div className="col-span-3 mt-2 p-2 bg-gray-50 border rounded text-xs">
          <strong>Debug horario (turno / reservas):</strong>
          <pre className="text-xs max-h-40 overflow-auto">{JSON.stringify({ turno: debugTurno, reservas: debugReservas, disponibles: horasDisponibles }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default HourPicker;

