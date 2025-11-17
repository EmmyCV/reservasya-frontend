import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Empleado, Servicio } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

interface BookingModalProps {
  service: Servicio;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose }) => {
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { profile } = useAuth();

  // Fetch employees for the selected service
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('empleadoserviciohorario')
          .select('idEmpleado, Empleado:usuario(id, nombre)')
          .eq('idServicio', service.idServicio);

        if (error) throw error;

        // Deduplicate employees
        const uniqueEmployees: Empleado[] = [];
        const seenIds = new Set();

        data?.forEach(item => {
          const empleado = Array.isArray(item.Empleado) ? item.Empleado[0] : item.Empleado;
          if (empleado && !seenIds.has(empleado.id)) {
            uniqueEmployees.push({
              id: empleado.id,
              nombre: empleado.nombre
            });
            seenIds.add(empleado.id);
          }
        });

        setEmployees(uniqueEmployees);
      } catch (err) {
        setError('Error al obtener empleados.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [service.idServicio]);


  // Generate AVAILABLE SLOTS using ONLY full hours
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedEmployee || !selectedDate) return;

    setLoading(true);
    setError(null);
    setAvailableSlots([]);

    try {
      const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' });

      // Fetch schedules for the employee for that day
      const { data: horarios, error: horarioError } = await supabase
        .from('horario')
        .select('horaInicio, horaFin')
        .in('idHorario',
          (
            await supabase
              .from('empleadoserviciohorario')
              .select('idHorario')
              .eq('idEmpleado', selectedEmployee.id)
              .eq('idServicio', service.idServicio)
          ).data?.map(h => h.idHorario) || []
        )
        .eq('diaSemana', dayOfWeek);

      if (horarioError || !horarios || horarios.length === 0) {
        throw new Error('No hay horarios disponibles para este día.');
      }

      // Fetch booked slots
      const { data: reservations } = await supabase
        .from('reserva')
        .select('hora, Servicio:servicio(duracion)')
        .eq('idEmpleado', selectedEmployee.id)
        .eq('fecha', selectedDate)
        .eq('estado', 'activa');

      const bookedSlots = reservations.map(r => {
        const [h, m] = r.hora.split(':').map(Number);
        const start = new Date(`${selectedDate}T${r.hora}`);
        const servicio = Array.isArray(r.Servicio) ? r.Servicio[0] : r.Servicio;
        const dur = servicio?.duracion ?? 60;

        const end = new Date(start.getTime() + dur * 60000);

        return { start, end };
      });

      const slots: string[] = [];
      const durationHours = Math.ceil(service.duracion / 60); // Convert duration to hours

      // Generate only FULL HOUR slots
      for (const schedule of horarios) {
        let currentTime = new Date(`${selectedDate}T${schedule.horaInicio}`);
        const endTime = new Date(`${selectedDate}T${schedule.horaFin}`);

        while (true) {
          const slotStart = new Date(currentTime);
          const slotEnd = new Date(currentTime);
          slotEnd.setHours(slotEnd.getHours() + durationHours);

          if (slotEnd > endTime) break;

          const isBooked = bookedSlots.some(booked =>
            (slotStart >= booked.start && slotStart < booked.end) ||
            (slotEnd > booked.start && slotEnd <= booked.end)
          );

          if (!isBooked) {
            slots.push(slotStart.toTimeString().substring(0, 5)); // HH:MM
          }

          currentTime.setHours(currentTime.getHours() + 1);
        }
      }

      setAvailableSlots(slots);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }

  }, [selectedEmployee, selectedDate, service.idServicio, service.duracion]);


  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);


  // Insert booking
  const handleBooking = async () => {
    if (!profile || !selectedEmployee || !selectedSlot || !selectedDate) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from('reserva').insert({
        idUsuarioCliente: profile.id,
        idEmpleado: selectedEmployee.id,
        idServicio: service.idServicio,
        fecha: selectedDate,
        hora: selectedSlot,
        estado: 'activa',
      });

      if (error) throw error;

      setSuccess(true);

    } catch (err) {
      setError('No se pudo confirmar la reserva. El horario puede haber sido tomado.');
    } finally {
      setLoading(false);
    }
  };


  const renderStep = () => {
    if (success) {
      return (
        <div className="text-center p-4">
          <h3 className="text-2xl font-bold text-green-600 mb-4">¡Reserva confirmada!</h3>
          <p>
            Tu cita para <strong>{service.nombre}</strong> con{' '}
            <strong>{selectedEmployee?.nombre}</strong> el{' '}
            <strong>{selectedDate}</strong> a las <strong>{selectedSlot}</strong> está lista.
          </p>
          <button onClick={onClose} className="mt-6 bg-primary text-white py-2 px-6 rounded-md hover:bg-primary-focus">
            Cerrar
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Step 1 */}
        <div className="mb-4">
          <h4 className="font-semibold text-lg mb-2">1. Selecciona un especialista</h4>
          {loading && employees.length === 0 ? (
            <Spinner />
          ) : (
            <div className="flex flex-wrap gap-2">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setStep(2);
                  }}
                  className={`px-4 py-2 rounded-md border ${
                    selectedEmployee?.id === emp.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {emp.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 */}
        {step >= 2 && (
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">2. Selecciona una fecha</h4>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                setSelectedDate(e.target.value);
                setStep(3);
              }}
              className="p-2 border rounded-md w-full"
            />
          </div>
        )}

        {/* Step 3 */}
        {step >= 3 && (
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">3. Selecciona una hora</h4>
            {loading ? (
              <Spinner />
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep(4);
                    }}
                    className={`px-4 py-2 rounded-md border ${
                      selectedSlot === slot
                        ? 'bg-primary text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay horarios disponibles.</p>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step >= 4 && selectedEmployee && selectedDate && selectedSlot && (
          <div>
            <h4 className="font-semibold text-lg mb-2">4. Confirmación</h4>
            <div className="bg-gray-100 p-4 rounded-md">
              <p><strong>Servicio:</strong> {service.nombre}</p>
              <p><strong>Empleado:</strong> {selectedEmployee.nombre}</p>
              <p><strong>Fecha:</strong> {selectedDate}</p>
              <p><strong>Hora:</strong> {selectedSlot}</p>
              <p><strong>Precio:</strong> ${service.precio.toFixed(2)}</p>

              <button
                onClick={handleBooking}
                disabled={loading}
                className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <Spinner /> : 'Confirmar reserva'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </>
    );
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-text-primary">Reservar: {service.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        {renderStep()}
      </div>
    </div>
  );
};

export default BookingModal;
