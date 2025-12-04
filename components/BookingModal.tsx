import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Empleado, Servicio } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './admin/Spinner';
import HourPicker from './HourPicker';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths } from 'date-fns';

interface BookingModalProps {
  service: Servicio | null;
  onClose: () => void;
}

interface CalendarPickerProps {
  idEmpleado: string;
  idservicio: number;
  duracionServicio: number;
  onSelectDate: (fecha: string) => void;
  selectedDate?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  idEmpleado,
  idservicio,
  duracionServicio,
  onSelectDate,
  selectedDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = async (month: Date) => {
    setLoading(true);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const fechasDisponibles: string[] = [];

    for (const day of days) {
      const fechaStr = format(day, 'yyyy-MM-dd');
      if (day.getDay() === 1) continue; // lunes
      if (fechaStr < format(new Date(), "yyyy-MM-dd")) continue;

      const { data: reservas } = await supabase
        .from('reserva')
        .select('hora')
        .eq('idempleado', idEmpleado)
        .eq('fecha', fechaStr)
        .neq('estado', 'cancelada');

      const { data: horarioEmpleado } = await supabase
        .from('empleado_horario')
        .select('horario(horainicio, horafin)')
        .eq('idusuarioempleado', idEmpleado);

      if (!horarioEmpleado || horarioEmpleado.length === 0) continue;

      const h = Array.isArray(horarioEmpleado[0].horario)
        ? horarioEmpleado[0].horario[0]
        : horarioEmpleado[0].horario;

      if (!h) continue;

      const horaInicio = parseInt(h.horainicio.split(':')[0], 10);
      const horaFin = parseInt(h.horafin.split(':')[0], 10);

      const ocupadas: number[] = [];
      for (const r of reservas ?? []) {
        const rh = parseInt(r.hora.split(':')[0], 10);
        ocupadas.push(rh);
      }

      let libre = false;
      for (let hCheck = horaInicio; hCheck + duracionServicio <= horaFin; hCheck++) {
        let bloqueLibre = true;
        for (let i = 0; i < duracionServicio; i++) {
          if (ocupadas.includes(hCheck + i)) {
            bloqueLibre = false;
            break;
          }
        }
        if (bloqueLibre) {
          libre = true;
          break;
        }
      }

      if (libre) fechasDisponibles.push(fechaStr);
    }

    setAvailableDates(fechasDisponibles);
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailability(currentMonth);
  }, [idEmpleado, duracionServicio, currentMonth]);

  const goPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayWeekIndex = (monthStart.getDay() + 6) % 7;
  const emptySlots = Array(firstDayWeekIndex).fill(null);
  const allDays: (Date | null)[] = [...emptySlots, ...days];

  const renderDay = (day: Date | null, index: number) => {
    if (!day) return <div key={index} style={{ width: 36, height: 36, margin: 2 }} />;

    const fechaStr = format(day, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const isMonday = day.getDay() === 1;
    const isPast = fechaStr < todayStr;
    const isAvailable = availableDates.includes(fechaStr);
    const isSelected = selectedDate === fechaStr;
    const disabled = isMonday || isPast || !isAvailable;

    const bg =
      isSelected ? '#73A954' :
      isAvailable ? '#A8D58C' :
      '#f0f0f0';

    return (
      <button
        key={fechaStr}
        onClick={() => !disabled && onSelectDate(fechaStr)}
        disabled={disabled}
        style={{
          backgroundColor: bg,
          color: disabled ? '#000' : '#fff',
          width: 36,
          height: 36,
          margin: 2,
          borderRadius: 4,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {day.getDate()}
      </button>
    );
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
        <button onClick={goPrevMonth} className="px-2 py-1 bg-gray-200 rounded">&lt;</button>
        <h3 className="font-semibold text-lg">
          {currentMonth.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={goNextMonth} className="px-2 py-1 bg-gray-200 rounded">&gt;</button>
      </div>

      {/* DÍAS DE LA SEMANA */}
      <div className="grid grid-cols-7 text-center font-semibold text-gray-600 mb-1">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* DÍAS DEL MES */}
      <div className="grid grid-cols-7 justify-center">
        {allDays.map((d, i) => renderDay(d, i))}
      </div>

      {loading && <div className="text-center mt-2">Cargando calendario...</div>}
    </div>
  );
};

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose }) => {
  if (!service) return null;

  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!service?.idServicio) return;
      setLoading(true);
      setError(null);
      try {
        const { data: empServData, error: empServError } = await supabase
          .from('empleado_servicio')
          .select('idusuarioempleado, usuario(id, nombre, activo)')
          .eq('idservicio', service.idServicio)
          .eq('usuario.activo', true);

        if (empServError) throw empServError;

        const list: Empleado[] = [];
        const seen = new Set<string>();
        for (const item of empServData || []) {
          const usuario = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
          if (!usuario?.id || !usuario?.nombre || seen.has(usuario.id)) continue;
          seen.add(usuario.id);
          list.push({ id: usuario.id, nombre: usuario.nombre });
        }
        setEmployees(list);
      } catch {
        setError('Error al obtener empleados disponibles.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [service?.idServicio]);

  const handleBooking = async () => {
    if (!user || !selectedEmployee || !selectedSlot || !selectedDate) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const horaInicio = selectedSlot + ":00";
      const duracion = Math.ceil((service.duracion ?? 60) / 60);
      const horaNum = parseInt(selectedSlot);

      const { data: reservas } = await supabase
        .from('reserva')
        .select('hora, idservicio')
        .eq('idempleado', selectedEmployee.id)
        .eq('fecha', selectedDate)
        .neq('estado', 'cancelada');

      const horasOcupadas: number[] = [];
      for (const r of reservas ?? []) {
        const hReserva = parseInt(r.hora.split(':')[0]);
        const { data: servData } = await supabase
          .from('servicio')
          .select('duracion')
          .eq('idservicio', r.idservicio)
          .single();
        const duracionReserva = Math.ceil((servData?.duracion ?? 60) / 60);
        for (let i = 0; i < duracionReserva; i++) horasOcupadas.push(hReserva + i);
      }

      for (let i = 0; i < duracion; i++) {
        if (horasOcupadas.includes(horaNum + i)) {
          setError('Ese horario ya está reservado.');
          setLoading(false);
          return;
        }
      }

      const { error: insertError } = await supabase.from('reserva').insert({
        idusuariocliente: user.id,
        idempleado: selectedEmployee.id,
        idservicio: service.idServicio,
        fecha: selectedDate,
        hora: horaInicio,
        estado: 'pendiente',
      });

      if (insertError) throw insertError;
      setSuccess(true);

    } catch {
      setError('No se pudo confirmar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  const SUCCESS_GREEN = "#73A954";
  const getContrastColor = (hex: string) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (0.299*r + 0.587*g + 0.114*b)/255 > 0.6 ? "#000000" : "#ffffff";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-text-primary">
            Reservar: {service.nombre}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        {!success ? (
          <>
            {loading ? <Spinner /> : (
              <>
                <div className="mb-4">
                  <h4 className="font-semibold text-lg mb-2">1. Selecciona un especialista</h4>
                  <div className="flex flex-wrap gap-2">
                    {employees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setStep(2);
                          setSelectedDate('');
                          setSelectedSlot(null);
                        }}
                        className={`px-4 py-2 rounded-md border transition ${selectedEmployee?.id === emp.id ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {emp.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {step >= 2 && selectedEmployee && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-lg mb-2">2. Selecciona una fecha</h4>
                    <CalendarPicker
                      idEmpleado={selectedEmployee.id}
                      idservicio={service.idServicio}
                      duracionServicio={Math.ceil((service.duracion ?? 60)/60)}
                      selectedDate={selectedDate}
                      onSelectDate={fecha => {
                        setSelectedDate(fecha);
                        setStep(3);
                        setSelectedSlot(null);
                      }}
                    />
                  </div>
                )}

                {step >= 3 && selectedEmployee && selectedDate && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-lg mb-2">3. Selecciona una hora</h4>
                    <HourPicker
                      idEmpleado={String(selectedEmployee.id)}
                      fecha={selectedDate}
                      idservicio={service.idServicio}
                      duracionServicio={Math.ceil((service.duracion ?? 60) / 60)}
                      selectedHora={selectedSlot ?? undefined}
                      onSelectHora={hora => { setSelectedSlot(hora); setStep(4); }}
                    />
                  </div>
                )}

                {step >= 4 && selectedSlot && (
                  <div>
                    <h4 className="font-semibold text-lg mb-2">4. Confirmación</h4>
                    <div className="bg-gray-100 p-4 rounded-md">
                      <p><strong>Servicio:</strong> {service.nombre}</p>
                      <p><strong>Empleado:</strong> {selectedEmployee?.nombre}</p>
                      <p><strong>Fecha:</strong> {selectedDate}</p>
                      <p><strong>Hora:</strong> {selectedSlot}</p>
                      <p><strong>Precio:</strong> ${service.precio?.toFixed(2)}</p>
                      <button
                        onClick={handleBooking}
                        disabled={loading}
                        style={{ backgroundColor: SUCCESS_GREEN, color: getContrastColor(SUCCESS_GREEN) }}
                        className="w-full mt-4 py-2 rounded-md disabled:opacity-50"
                      >
                        {loading ? <Spinner /> : 'Confirmar reserva'}
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="text-red-500 mt-4">{error}</p>}
              </>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <h3 className="text-2xl font-bold mb-4" style={{ color: SUCCESS_GREEN }}>¡Reserva confirmada!</h3>
            <p>
              Tu cita para <strong>{service.nombre}</strong> con <strong>{selectedEmployee?.nombre}</strong> el <strong>{selectedDate}</strong> a las <strong>{selectedSlot}</strong> está confirmada.
            </p>
            <button
              onClick={onClose}
              style={{ backgroundColor: SUCCESS_GREEN, color: getContrastColor(SUCCESS_GREEN) }}
              className="mt-6 py-2 px-6 rounded-md"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
