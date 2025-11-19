import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { Reserva } from '../types';
import { useAuth } from '../contexts/AuthContext';

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const offset = (startDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const matrix: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < offset; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const EmployeeCalendar: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [eventsByDate, setEventsByDate] = useState<Record<string, Reserva[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthMatrix = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reserva')
        .select(`*, Cliente:usuario!reserva_idcliente_fkey (*), Empleado:usuario!reserva_idempleado_fkey (*), Servicio:servicio!reserva_idservicio_fkey (*)`)
        .gte('fecha', firstDay)
        .lte('fecha', lastDay)
        .eq('idempleado', user.id)
        .order('fecha')
        .order('hora');

      if (error) throw error;

      const grouped: Record<string, Reserva[]> = {};
      (data || []).forEach((r: any) => {
        const key = r.fecha;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r as Reserva);
      });

      setEventsByDate(grouped);
    } catch (err) {
      console.error('Error fetching employee reservations', err);
    } finally {
      setLoading(false);
    }
  }, [year, month, user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else setMonth(m => m + 1);
  };

  const onSelectDay = (d: number | null) => {
    if (!d) return;
    const dateKey = new Date(year, month, d).toISOString().split('T')[0];
    setSelectedDate(dateKey);
  };

  const closeModal = () => setSelectedDate(null);

  if (!user) return <div className="p-4">Inicia sesión para ver tu calendario.</div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">{new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-2 py-1 bg-gray-100 rounded">Ant</button>
          <button onClick={nextMonth} className="px-2 py-1 bg-gray-100 rounded">Sig</button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-600 mb-1">
        {weekdays.map(w => <div key={w} className="py-1">{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthMatrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const dateKey = d ? new Date(year, month, d).toISOString().split('T')[0] : null;
              const events = dateKey ? eventsByDate[dateKey] || [] : [];
              const isToday = dateKey === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={di}
                  onClick={() => onSelectDay(d)}
                  className={`h-24 p-2 text-left border rounded bg-white ${d ? 'hover:bg-gray-50' : 'bg-gray-50 pointer-events-none'} ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium">{d || ''}</span>
                    {events.length > 0 && (
                      <span className="text-xs bg-primary text-white px-1 rounded">{events.length}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-700 space-y-1">
                    {events.slice(0, 2).map((ev, idx) => (
                      <div key={idx} className="truncate">{ev.hora} • {ev.Servicio?.nombre || 'Servicio'}</div>
                    ))}
                    {events.length > 2 && <div className="text-xs text-gray-500">+{events.length - 2} más</div>}
                  </div>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {loading && <div className="mt-3 text-sm text-gray-500">Cargando eventos...</div>}

      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Tus reservas - {selectedDate}</h3>
              <button onClick={closeModal} className="px-2 py-1 bg-gray-200 rounded">Cerrar</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(eventsByDate[selectedDate] || []).map((r, i) => (
                <div key={i} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{r.Servicio?.nombre || 'Servicio'}</div>
                      <div className="text-sm text-gray-600">{r.hora} — Cliente: {r.Usuario?.nombre || 'N/A'}</div>
                    </div>
                    <div className="text-sm text-gray-500">{r.estado}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">Contacto: {r.Usuario?.telefono || '—'}</div>
                </div>
              ))}
              {(!eventsByDate[selectedDate] || eventsByDate[selectedDate].length === 0) && (
                <div className="text-gray-500">No tienes reservas para este día.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCalendar;
