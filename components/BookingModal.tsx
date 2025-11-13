
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
    data.forEach(item => {
      // Empleado can be returned as an object or as an array depending on relation
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
      } catch (err: any) {
        setError('Could not fetch available staff.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [service.idServicio]);

  // Fetch available slots when employee and date are selected
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedEmployee || !selectedDate) return;
    setLoading(true);
    setError(null);
    setAvailableSlots([]);
    try {
        const dayOfWeek = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' });
        
    const { data: horarios, error: horarioError } = await supabase
      .from('horario')
            .select('horaInicio, horaFin')
            .in('idHorario', (
        await supabase
        .from('empleadoserviciohorario')
                .select('idHorario')
                .eq('idEmpleado', selectedEmployee.id)
                .eq('idServicio', service.idServicio)
            ).data?.map(h => h.idHorario) || [])
            .eq('diaSemana', dayOfWeek);

        if (horarioError || !horarios || horarios.length === 0) {
            throw new Error('No available schedule for this day.');
        }

    const { data: reservations, error: reservationError } = await supabase
      .from('reserva')
      .select('hora, Servicio:servicio(duracion)')
            .eq('idEmpleado', selectedEmployee.id)
            .eq('fecha', selectedDate)
            .in('estado', ['activa']);

        if (reservationError) throw reservationError;
        
    const bookedSlots = reservations.map(r => {
      const startTime = r.hora;
      // Servicio may come as object or array depending on the select; normalize
      const servicio = Array.isArray(r.Servicio) ? r.Servicio[0] : r.Servicio;
      const duration = servicio?.duracion ?? 0;
            const [hours, minutes] = startTime.split(':').map(Number);
            const start = new Date();
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + duration * 60000);
            return { start, end };
        });

        const slots: string[] = [];
        for (const schedule of horarios) {
            let currentTime = new Date(`${selectedDate}T${schedule.horaInicio}`);
            const endTime = new Date(`${selectedDate}T${schedule.horaFin}`);

            while (currentTime.getTime() + service.duracion * 60000 <= endTime.getTime()) {
                const slotEnd = new Date(currentTime.getTime() + service.duracion * 60000);
                const isBooked = bookedSlots.some(booked => 
                    (currentTime >= booked.start && currentTime < booked.end) ||
                    (slotEnd > booked.start && slotEnd <= booked.end)
                );

                if (!isBooked) {
                    slots.push(currentTime.toTimeString().substring(0, 5));
                }
                currentTime.setMinutes(currentTime.getMinutes() + 15); // Check every 15 mins for a slot
            }
        }
        setAvailableSlots(slots);
        
    } catch (err: any) {
        setError(err.message || 'Failed to fetch slots.');
    } finally {
        setLoading(false);
    }
  }, [selectedEmployee, selectedDate, service.idServicio, service.duracion]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);


  const handleBooking = async () => {
    if (!profile || !selectedEmployee || !selectedSlot || !selectedDate) {
      setError('All fields are required.');
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
    } catch (err: any) {
      setError('Booking failed. The slot may have just been taken.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if(success) {
      return (
        <div className="text-center p-4">
            <h3 className="text-2xl font-bold text-green-600 mb-4">Booking Confirmed!</h3>
            <p>Your appointment for <strong>{service.nombre}</strong> with <strong>{selectedEmployee?.nombre}</strong> on <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong> is confirmed.</p>
            <button onClick={onClose} className="mt-6 bg-primary text-white py-2 px-6 rounded-md hover:bg-primary-focus">Close</button>
        </div>
      )
    }

    return (
      <>
        {/* Step 1: Select Employee */}
        <div className={step >= 1 ? 'mb-4' : 'hidden'}>
          <h4 className="font-semibold text-lg mb-2">1. Select a Specialist</h4>
          {loading && step === 1 ? <Spinner /> : (
            <div className="flex flex-wrap gap-2">
              {employees.map(emp => (
                <button key={emp.id} onClick={() => { setSelectedEmployee(emp); setStep(2); }} className={`px-4 py-2 rounded-md border ${selectedEmployee?.id === emp.id ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                  {emp.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Select Date */}
        <div className={step >= 2 ? 'mb-4' : 'hidden'}>
          <h4 className="font-semibold text-lg mb-2">2. Select a Date</h4>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setStep(3); }} min={new Date().toISOString().split('T')[0]} className="p-2 border rounded-md w-full"/>
        </div>
        
        {/* Step 3: Select Time */}
        <div className={step >= 3 ? 'mb-4' : 'hidden'}>
          <h4 className="font-semibold text-lg mb-2">3. Select a Time</h4>
          {loading && step === 3 ? <Spinner /> :
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} onClick={() => { setSelectedSlot(slot); setStep(4); }} className={`px-4 py-2 rounded-md border ${selectedSlot === slot ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                  {slot}
                </button>
              )) : <p className="text-text-secondary col-span-full">No available slots for this date.</p>}
            </div>
          }
        </div>
        
        {/* Step 4: Confirmation */}
        <div className={step >= 4 ? '' : 'hidden'}>
          <h4 className="font-semibold text-lg mb-2">4. Confirm Your Booking</h4>
          {selectedEmployee && selectedDate && selectedSlot && (
            <div className="bg-secondary p-4 rounded-md">
                <p><strong>Service:</strong> {service.nombre}</p>
                <p><strong>With:</strong> {selectedEmployee.nombre}</p>
                <p><strong>On:</strong> {selectedDate} at {selectedSlot}</p>
                <p><strong>Price:</strong> ${service.precio.toFixed(2)}</p>
                <button onClick={handleBooking} disabled={loading} className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50">
                    {loading ? <Spinner/> : 'Confirm & Book'}
                </button>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-text-primary">Book: {service.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <div>
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
