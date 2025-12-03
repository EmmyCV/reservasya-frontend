import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Empleado, Servicio } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import HourPicker from './HourPicker';

interface BookingModalProps {
  service: Servicio | null;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose }) => {
  if (!service) return null;

  const [step, setStep] = useState(1);
  const [employees, setEmployees] = useState<Empleado[]>([]);
  const [rawEmployees, setRawEmployees] = useState<any[] | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  // =====================================================
  // CARGAR EMPLEADOS QUE PUEDEN REALIZAR ESTE SERVICIO
  // =====================================================
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!service?.idServicio) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('empleado_servicio')
          .select('idusuarioempleado, usuario(id, nombre)')
          .eq('idservicio', service.idServicio);

        if (error) throw error;

        const list: Empleado[] = [];
        const seen = new Set<string>();

        data?.forEach(item => {
          const usuario = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;

          if (usuario?.id && usuario?.nombre && !seen.has(usuario.id)) {
            seen.add(usuario.id);
            list.push({ id: usuario.id, nombre: usuario.nombre });
          }
        });

        setRawEmployees(data || null);
        setEmployees(list);
      } catch {
        setError('Error al obtener empleados para este servicio.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [service?.idServicio]);

  // =====================================================
  //     GUARDAR RESERVA
  // =====================================================
  const handleBooking = async () => {
    if (!user || !selectedEmployee || !selectedSlot || !selectedDate) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const horaInicio = `${selectedSlot}:00`;
      const duracion = Math.ceil((service.duracion ?? 60) / 60);
      const horaNum = parseInt(selectedSlot);

      // =====================================================
      // VERIFICAR HORAS OCUPADAS (solo estado != cancelada)
      // =====================================================
      const { data: reservas, error: errorReservas } = await supabase
        .from('reserva')
        .select('hora')
        .eq('idempleado', selectedEmployee.id)
        .eq('fecha', selectedDate)
        .neq('estado', 'cancelada'); // IMPORTANTE

      if (errorReservas) throw errorReservas;

      const horasOcupadas = (reservas ?? []).map(r =>
        parseInt(r.hora.split(':')[0])
      );

      for (let i = 0; i < duracion; i++) {
        if (horasOcupadas.includes(horaNum + i)) {
          setError('Ese horario ya está reservado.');
          setLoading(false);
          return;
        }
      }

      // =====================================================
      // INSERTAR RESERVA
      // =====================================================
      const { error: insertError } = await supabase.from('reserva').insert({
        idusuariocliente: user.id,
        idempleado: selectedEmployee.id,
        idservicio: service.idServicio,
        fecha: selectedDate,
        hora: horaInicio,
        estado: 'pendiente'
      });

      if (insertError) throw insertError;

      setSuccess(true);

    } catch (err) {
      console.error("Error guardando reserva:", err);
      setError('No se pudo confirmar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  //     COLORES DE ESTILO
  // =====================================================
  const SUCCESS_GREEN = "#73A954";

  const darken = (hex: string, amt = 18) => {
    const c = hex.replace("#", "");
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);
    r = Math.max(0, r - amt);
    g = Math.max(0, g - amt);
    b = Math.max(0, b - amt);
    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const getContrastColor = (hex: string) => {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#000000" : "#ffffff";
  };

  // =====================================================
  //     UI
  // =====================================================
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
            {/* PASO 1: EMPLEADO */}
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
                    className={`px-4 py-2 rounded-md border transition ${
                      selectedEmployee?.id === emp.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {emp.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* PASO 2: FECHA */}
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

            {/* PASO 3: HORA */}
            {step >= 3 && selectedEmployee && selectedDate && (
              <div className="mb-4">
                <h4 className="font-semibold text-lg mb-2">3. Selecciona una hora</h4>

                <HourPicker
                  idEmpleado={String(selectedEmployee.id)}
                  fecha={selectedDate}
                  idservicio={service.idServicio}
                  duracionServicio={Math.ceil((service.duracion ?? 60) / 60)}
                  selectedHora={selectedSlot ?? undefined}
                  onSelectHora={(hora) => {
                    setSelectedSlot(hora);
                    setStep(4);
                  }}
                  
                />
              </div>
            )}

            {/* PASO 4: CONFIRMAR */}
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
                    style={{
                      backgroundColor: SUCCESS_GREEN,
                      borderColor: darken(SUCCESS_GREEN, 20),
                      color: getContrastColor(SUCCESS_GREEN),
                    }}
                    className="w-full mt-4 py-2 rounded-md disabled:opacity-50"
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
            <h3 className="text-2xl font-bold mb-4" style={{ color: SUCCESS_GREEN }}>¡Reserva confirmada!</h3>
            <p>
              Tu cita para <strong>{service.nombre}</strong> con
              <strong> {selectedEmployee?.nombre}</strong> el <strong>{selectedDate}</strong> a las
              <strong> {selectedSlot}</strong> está confirmada.
            </p>
            <button
              onClick={onClose}
              style={{
                backgroundColor: SUCCESS_GREEN,
                color: getContrastColor(SUCCESS_GREEN),
                borderColor: darken(SUCCESS_GREEN, 20)
              }}
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

