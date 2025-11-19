import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Empleado, Servicio } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import HourPicker from './HourPicker';

interface BookingModalProps {
  service: Servicio;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose }) => {
  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [rawEmployees, setRawEmployees] = useState<any[] | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { profile } = useAuth();

  // 📌 Traer empleados que realizan el servicio
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('empleado_servicio')
          .select('idusuarioempleado, usuario(id, nombre)')
          .eq('idservicio', service.idServicio);

        if (error) throw error;

        console.debug('[BookingModal] empleado_servicio raw data:', data);

        const unique: Empleado[] = [];
        const seen = new Set<string>();

        (data || []).forEach((item: any) => {
          const usuario = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
          // prefer usuario.id (UUID) if available, otherwise use idusuarioempleado
          const idRaw = usuario?.id ?? item.idusuarioempleado;
          const id = idRaw != null ? String(idRaw) : null;
          const nombre = usuario?.nombre ?? item.nombre;

          if (id && nombre && !seen.has(id)) {
            unique.push({ id, nombre });
            seen.add(id);
          }
        });

        console.debug('[BookingModal] mapped employees:', unique);
        setRawEmployees(data || null);
        setEmployees(unique);
      } catch {
        setError('Error al obtener empleados para este servicio.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [service.idServicio]);

  // 📌 Guardar reserva
  const handleBooking = async () => {
    if (!profile || !selectedEmployee || !selectedSlot || !selectedDate) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('reserva').insert({
        idusuariocliente: profile.id,
        idempleado: selectedEmployee.id,
        idservicio: service.idServicio,
        fecha: selectedDate,
        hora: selectedSlot,
        estado: 'activa',
      });
      if (error) throw error;
      setSuccess(true);
    } catch {
      setError('No se pudo confirmar la reserva.');
    } finally {
      setLoading(false);
    }
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
            {/* PASO 1 */}
            <div className="mb-4">
              <h4 className="font-semibold text-lg mb-2">1. Selecciona un especialista</h4>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowDebug(s => !s)}
                  className="text-sm px-2 py-1 bg-gray-200 rounded"
                >
                  {showDebug ? 'Ocultar debug' : 'Mostrar debug'}
                </button>
                <span className="text-xs text-gray-500">(muestra objetos crudos de la consulta)</span>
              </div>
              {loading && !employees.length ? (
                <Spinner />
              ) : (
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
                      className={`px-4 py-2 rounded-md border ${
                        selectedEmployee?.id === emp.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      {emp.nombre}
                    </button>
                  ))}
                  {!employees.length && <p>No hay empleados disponibles.</p>}
                </div>
              )}
              {showDebug && (
                <div className="mt-3 p-2 bg-gray-50 border rounded text-xs">
                  <strong>Raw empleado_servicio:</strong>
                  <pre className="text-xs max-h-40 overflow-auto">{JSON.stringify(rawEmployees, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* PASO 2 */}
            {step >= 2 && (
              <div className="mb-4">
                <h4 className="font-semibold text-lg mb-2">2. Selecciona una fecha</h4>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setStep(3);
                    setSelectedSlot(null);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="p-2 border rounded-md w-full"
                />
              </div>
            )}

            {/* PASO 3 */}
            {step >= 3 && selectedEmployee && selectedDate && (
              <div className="mb-4">
                <h4 className="font-semibold text-lg mb-2">3. Selecciona una hora</h4>
                <HourPicker
                  idEmpleado={String(selectedEmployee.id)}
                  fecha={selectedDate}
                  idServicio={service.idServicio}
                  duracionServicio={Math.ceil((service.duracion ?? 60) / 60)}
                  showDebug={showDebug}
                  onSelectHora={(hour) => {
                    setSelectedSlot(hour);
                    setStep(4);
                  }}
                />
              </div>
            )}

            {/* PASO 4 */}
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
                    className="w-full mt-4 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? <Spinner /> : 'Confirmar reserva'}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 mt-4">{error}</p>}
          </>
        ) : (
          <div className="text-center p-4">
            <h3 className="text-2xl font-bold text-green-600 mb-4">¡Reserva confirmada!</h3>
            <p>
              Tu cita para <strong>{service.nombre}</strong> con{' '}
              <strong>{selectedEmployee?.nombre}</strong> el <strong>{selectedDate}</strong> a las{' '}
              <strong>{selectedSlot}</strong> está confirmada.
            </p>
            <button onClick={onClose} className="mt-6 bg-primary text-white py-2 px-6 rounded-md hover:bg-primary-focus">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
