import { supabase } from '../services/supabase';

// Normalize string: lowercase, remove diacritics
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const dayMap: Record<string, string> = {
  Sunday: 'domingo',
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
};

function parseTimeToDate(dateStr: string, timeStr: string) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  return new Date(`${dateStr}T${timeStr}:00`);
}

function formatDateToHHMM(d: Date) {
  return d.toTimeString().substring(0, 5);
}

export async function getAvailableSlots(
  idEmpleado: string,
  fecha: string,
  durationHours: number
): Promise<string[]> {
  // Business rule: closed Mondays
  const dayIdx = new Date(fecha).getDay(); // 0 Sunday, 1 Monday
  if (dayIdx === 1) return [];

  // fetch empleado_horario rows with nested horario where possible
  const { data: empHorarios, error: empErr } = await supabase
    .from('empleado_horario')
    .select('idhorario, horario(horainicio, horafin, diasemana, nombre)')
    .eq('idusuarioempleado', idEmpleado);

  if (empErr) throw empErr;

  const horarioRows: any[] = [];

  for (const row of (empHorarios || [])) {
    if (row.horario) {
      const h = Array.isArray(row.horario) ? row.horario[0] : row.horario;
      horarioRows.push({ ...h, idhorario: row.idhorario });
    } else if (row.idhorario) {
      const { data: hdata } = await supabase
        .from('horario')
        .select('horainicio, horafin, diasemana, nombre')
        .eq('idhorario', row.idhorario)
        .maybeSingle();
      if (hdata) horarioRows.push({ ...hdata, idhorario: row.idhorario });
    }
  }

  if (!horarioRows.length) return [];

  // Determine target day name (normalized)
  const dayNameEn = new Date(fecha).toLocaleString('en-US', { weekday: 'long' });
  const dayName = dayMap[dayNameEn] ?? normalize(dayNameEn);

  // Filter horarios applicable for the day
  const horariosForDay = horarioRows.filter((h: any) => {
    const raw = (h.diasemana ?? h.diaSemana ?? h.nombre ?? '')?.toString() ?? '';
    if (!raw) return true; // applies to all days
    const ds = normalize(raw);
    const parts = ds.split(/[;,|\\/\-]+/).map((p: string) => p.trim());
    return parts.some((p: string) => p.includes(dayName) || dayName.includes(p));
  });

  if (!horariosForDay.length) return [];

  // Fetch reservations for the employee on that date
  const { data: reservations } = await supabase
    .from('reserva')
    .select('hora, duracion')
    .eq('idempleado', idEmpleado)
    .eq('fecha', fecha);

  const bookedRanges: { start: Date; end: Date }[] = (reservations || []).map((r: any) => {
    const start = parseTimeToDate(fecha, r.hora);
    const durMin = r.duracion != null ? Number(r.duracion) : durationHours * 60;
    const end = new Date(start.getTime() + durMin * 60000);
    return { start, end };
  });

  const slots: string[] = [];
  const durationMs = durationHours * 60 * 60 * 1000;

  for (const sched of horariosForDay) {
    const startStr = sched.horainicio ?? sched.horaInicio ?? sched.hora_inicio;
    const endStr = sched.horafin ?? sched.horaFin ?? sched.hora_fin;
    if (!startStr || !endStr) continue;

    let current = parseTimeToDate(fecha, startStr);
    const endTime = parseTimeToDate(fecha, endStr);

    while (current.getTime() + durationMs <= endTime.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durationMs);

      // check overlap
      const isBooked = bookedRanges.some(b => (slotStart >= b.start && slotStart < b.end) || (slotEnd > b.start && slotEnd <= b.end));
      if (!isBooked) slots.push(formatDateToHHMM(slotStart));

      // step by 1 hour
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
  }

  // deduplicate and sort
  return Array.from(new Set(slots)).sort();
}

export default getAvailableSlots;
import { supabase } from '../services/supabase';

// Normalize string: lowercase, remove diacritics
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const dayMap: Record<string, string> = {
  Sunday: 'domingo',
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
};

function parseTimeToDate(dateStr: string, timeStr: string) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  return new Date(`${dateStr}T${timeStr}:00`);
}

function formatDateToHHMM(d: Date) {
  return d.toTimeString().substring(0, 5);
}

export async function getAvailableSlots(
  idEmpleado: string,
  fecha: string,
  durationHours: number
): Promise<string[]> {
  // Business rule: closed Mondays
  const dayIdx = new Date(fecha).getDay(); // 0 Sunday, 1 Monday
  if (dayIdx === 1) return [];

  // fetch empleado_horario rows with nested horario where possible
  const { data: empHorarios, error: empErr } = await supabase
    .from('empleado_horario')
    .select('idhorario, horario(horainicio, horafin, diasemana, nombre)')
    .eq('idusuarioempleado', idEmpleado);

  if (empErr) throw empErr;

  const horarioRows: any[] = [];

  for (const row of (empHorarios || [])) {
    if (row.horario) {
      const h = Array.isArray(row.horario) ? row.horario[0] : row.horario;
      horarioRows.push({ ...h, idhorario: row.idhorario });
    } else if (row.idhorario) {
      const { data: hdata } = await supabase
        .from('horario')
        .select('horainicio, horafin, diasemana, nombre')
        .eq('idhorario', row.idhorario)
        .maybeSingle();
      if (hdata) horarioRows.push({ ...hdata, idhorario: row.idhorario });
    }
  }

  if (!horarioRows.length) return [];

  // Determine target day name (normalized)
  const dayNameEn = new Date(fecha).toLocaleString('en-US', { weekday: 'long' });
  const dayName = dayMap[dayNameEn] ?? normalize(dayNameEn);

  // Filter horarios applicable for the day
  const horariosForDay = horarioRows.filter((h: any) => {
    const raw = (h.diasemana ?? h.diaSemana ?? h.nombre ?? '')?.toString() ?? '';
    if (!raw) return true; // applies to all days
    const ds = normalize(raw);
    const parts = ds.split(/[;,|\\/\-]+/).map((p: string) => p.trim());
    return parts.some((p: string) => p.includes(dayName) || dayName.includes(p));
  });

  if (!horariosForDay.length) return [];

  // Fetch reservations for the employee on that date
  const { data: reservations } = await supabase
    .from('reserva')
    .select('hora, duracion')
    .eq('idempleado', idEmpleado)
    .eq('fecha', fecha);

  const bookedRanges: { start: Date; end: Date }[] = (reservations || []).map((r: any) => {
    const start = parseTimeToDate(fecha, r.hora);
    const durMin = r.duracion != null ? Number(r.duracion) : durationHours * 60;
    const end = new Date(start.getTime() + durMin * 60000);
    return { start, end };
  });

  const slots: string[] = [];
  const durationMs = durationHours * 60 * 60 * 1000;

  for (const sched of horariosForDay) {
    const startStr = sched.horainicio ?? sched.horaInicio ?? sched.hora_inicio;
    const endStr = sched.horafin ?? sched.horaFin ?? sched.hora_fin;
    if (!startStr || !endStr) continue;

    let current = parseTimeToDate(fecha, startStr);
    const endTime = parseTimeToDate(fecha, endStr);

    while (current.getTime() + durationMs <= endTime.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durationMs);

      // check overlap
      const isBooked = bookedRanges.some(b => (slotStart >= b.start && slotStart < b.end) || (slotEnd > b.start && slotEnd <= b.end));
      if (!isBooked) slots.push(formatDateToHHMM(slotStart));

      // step by 1 hour
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }
  }

  // deduplicate and sort
  return Array.from(new Set(slots)).sort();
}

export default getAvailableSlots;
