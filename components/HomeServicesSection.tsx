import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Servicio } from '../types';

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import HourPicker from "./HourPicker";

// --- FLUJO DE RESERVA ---
import BookingFlow from './ImageBookingFlow';
// ------------------------

const TABS = [
  'Cabello',
  'Pestañas',
  'Depilación',
  'Maquillaje y Peinado',
  'Manos y Pies',
];

const HomeServicesSection: React.FC = () => {
  const [services, setServices] = useState<Servicio[]>([]);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // --- ESTADOS DEL FLUJO ---
  const [stepActive, setStepActive] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  // --------------------------

  // Inline booking flow states
  const [flowActive, setFlowActive] = useState(false); // si el panel inline está visible
  const [flowStep, setFlowStep] = useState<number>(1); // 1: especialistas, 2: calendario, 3: horas, 4: confirmar, 5: éxito
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('servicio')
        .select('idservicio, nombreservicio, descripcion, duracion, precio, imagen_url, tipo')
        .order('nombreservicio');

      const items = (data || []).map((s: any) => ({
        idServicio: s.idservicio,
        nombre: s.nombreservicio,
        descripcion: s.descripcion,
        duracion: (function () {
          const v = s.duracion;
          if (v == null) return 60;
          if (typeof v === 'number') return v;
          if (/^\d+$/.test(String(v))) return Number(v);
          if (/^\d{2}:\d{2}:\d{2}$/.test(String(v))) {
            const parts = String(v).split(':').map(Number);
            return (parts[0] || 0) * 60 + (parts[1] || 0);
          }
          const n = Number(v);
          return Number.isFinite(n) ? n : 60;
        })(),
        precio: s.precio,
        imagenKey: s.imagen_url,
        tipo: s.tipo,
      }));

      const resolved = await Promise.all(items.map(async (it) => {
        if (!it.imagenKey) return { ...it, imagenUrl: '/src/assets/unnamed.jpg' };

        const pub = supabase.storage.from('servicios').getPublicUrl(it.imagenKey);
        let url = pub.data?.publicUrl || '';

        if (!url) {
          try {
            const signed = await supabase.storage.from('servicios').createSignedUrl(it.imagenKey, 60);
            url = signed.data?.signedUrl || '';
          } catch (e) {
            url = '';
          }
        }

        return { ...it, imagenUrl: url || '/src/assets/unnamed.jpg' };
      }));

      setServices(resolved as any);
    };

    load();
  }, []);

  const filtered = services.filter(s => s.tipo === activeTab);
  const visible = filtered.slice(carouselIndex, carouselIndex + 4);

  const handlePrev = () => setCarouselIndex(i => Math.max(i - 1, 0));
  const handleNext = () =>
    setCarouselIndex(i => Math.min(i + 1, Math.max(filtered.length - 4, 0)));

  // ---- flow helpers ----
  const openFlowForService = async (service: any) => {
    setSelectedService(service);
    setFlowActive(true);
    setFlowStep(1);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedHour(null);
    setSuccess(false);
    setError(null);

    // cargar especialistas para servicio
    try {
      const { data, error } = await supabase
        .from('empleado_servicio')
        .select('idusuarioempleado, usuario(id, nombre, foto)')
        .eq('idservicio', service.idServicio);

      if (error) {
        console.error('Error fetch employees', error);
        setEmployees([]);
        return;
      }
      const list = (data || []).map((row: any) => {
        const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
        return {
          id: u?.id ?? row.idusuarioempleado,
          nombre: u?.nombre ?? 'Especialista',
          foto: u?.foto ?? null,
        };
      });
      setEmployees(list);
    } catch (e) {
      console.error(e);
      setEmployees([]);
    }
  };

  const closeFlow = () => {
    setFlowActive(false);
    setSelectedService(null);
    setFlowStep(1);
    setEmployees([]);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedHour(null);
    setError(null);
    setSuccess(false);
  };

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setFlowStep(3); // ir a selector de horas
  };

  const handleConfirm = async () => {
    setError(null);
    if (!selectedEmployee || !selectedDate || !selectedHour || !selectedService) {
      setError('Completa especialista, fecha y hora.');
      return;
    }
    setLoadingConfirm(true);
    try {
      const horaInicio = `${selectedHour}:00`;
      const duracion = Math.ceil((selectedService.duracion ?? 60) / 60);

      const { data: reservas } = await supabase
        .from('reserva')
        .select('hora')
        .eq('idempleado', selectedEmployee.id)
        .eq('fecha', selectedDate);

      const horaNum = parseInt(selectedHour);
      const horasOcupadas = (reservas || []).map((r: any) => parseInt(r.hora.split(':')[0]));

      for (let i = 0; i < duracion; i++) {
        if (horasOcupadas.includes(horaNum + i)) {
          setError('Ese horario ya está reservado para el especialista.');
          setLoadingConfirm(false);
          return;
        }
      }

      const { error: insErr } = await supabase.from('reserva').insert({
        idusuariocliente: (window as any).__USER_ID__ || null, // si tienes user context reemplaza aquí
        idempleado: selectedEmployee.id,
        idservicio: selectedService.idServicio,
        fecha: selectedDate,
        hora: horaInicio,
        estado: 'pendiente',
        disponible: false,
      });

      if (insErr) throw insErr;
      setSuccess(true);
      setFlowStep(5);
    } catch (e: any) {
      console.error('Error creating reserva', e);
      setError('No se pudo crear la reserva.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  // ---- colors for select button (reference-like) ----
  const SELECT_PINK = '#FF7A95';
  const SELECT_PINK_TEXT = '#fff';

  // ===============================================================
  //                 SI EL FLUJO ESTÁ ACTIVO → LO MOSTRAMOS
  // ===============================================================
  if (stepActive && selectedService) {
    return (
      <section className="py-12 px-4 md:px-16 bg-white">
        <BookingFlow
          service={selectedService}
          onClose={() => {
            setStepActive(false);
            setSelectedService(null);
          }}
        />
      </section>
    );
  }

  // ===============================================================
  //                    SI NO → MOSTRAR SERVICIOS
  // ===============================================================
  return (
    <section className="py-12 px-4 md:px-16 bg-white">
      <h2 className="text-3xl font-bold mb-8">Servicios</h2>

      <div className="flex gap-6 border-b mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`pb-3 px-2 font-medium border-b-2 transition whitespace-nowrap ${activeTab === tab
                ? 'border-black text-black'
                : 'border-transparent text-gray-500'
              }`}
            onClick={() => {
              setActiveTab(tab);
              setCarouselIndex(0);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop carousel area (relative so panel can slide in) */}
      <div className="relative hidden md:flex items-center h-[520px]">
        <button
          onClick={handlePrev}
          disabled={carouselIndex === 0}
          className="absolute left-0 z-10 bg-white shadow p-3 rounded-full disabled:opacity-20"
        >
          &#8592;
        </button>

        <div className="w-full grid grid-cols-4 gap-6 px-10">
          {visible.map(s => (
            <div key={s.idServicio} className="bg-white rounded-lg shadow-sm p-4 flex flex-col">
              <div className="w-full h-64 rounded overflow-hidden mb-4">
                <img
                  src={s.imagenUrl}
                  alt={s.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="font-semibold text-lg">{s.nombre}</div>
              <div className="text-gray-700 mt-1 mb-4">${s.precio.toFixed(2)}</div>

              <button
                style={{ borderColor: '#D8AFA7' }}
                className="w-full border rounded py-2 font-medium transition"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D8AFA7';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'black';
                }}
                onClick={() => openFlowForService(s)}
              >
                Agendar cita
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={carouselIndex + 4 >= filtered.length}
          className="absolute right-0 z-10 bg-white shadow p-3 rounded-full disabled:opacity-20"
        >
          &#8594;
        </button>

        {/* Inline sliding panel: renderizar solo si flowActive === true */}
        {flowActive && (
          <div
            className="absolute inset-0 bg-white shadow-lg"
            style={{
              transform: 'translateX(0%)',
              transition: 'transform 320ms cubic-bezier(.22,.9,.32,1)',
              zIndex: 30,
              padding: 24,
              overflow: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (flowStep === 1) closeFlow();
                    else setFlowStep(s => Math.max(1, s - 1));
                  }}
                  className="text-gray-600"
                >
                  ←
                </button>
                <h3 className="text-xl font-semibold">
                  {flowStep === 1 && `Especialistas — ${selectedService?.nombre}`}
                  {flowStep === 2 && `Selecciona fecha — ${selectedEmployee?.nombre}`}
                  {flowStep === 3 && `Selecciona hora — ${selectedDate}`}
                  {flowStep === 4 && `Confirmar cita`}
                  {flowStep === 5 && `¡Listo!`}
                </h3>
              </div>

              <button onClick={closeFlow} className="text-gray-600">✕</button>
            </div>

            {/* STEP 1: especialistas */}
            {flowStep === 1 && (
              <div className="space-y-4">
                {employees.map(emp => (
                  <div key={emp.id} className="p-4 border rounded flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                        {emp.foto ? <img src={emp.foto} alt={emp.nombre} className="w-full h-full object-cover" /> : <span className="text-gray-400">👤</span>}
                      </div>
                      <div>
                        <div className="font-medium">{emp.nombre}</div>
                        <div className="text-sm text-gray-500">Especialista</div>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setFlowStep(2);
                        }}
                        style={{ backgroundColor: SELECT_PINK, color: SELECT_PINK_TEXT }}
                        className="px-4 py-2 rounded"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && <div className="text-gray-600">No hay especialistas disponibles.</div>}
              </div>
            )}

            {/* STEP 2: calendario */}
            {flowStep === 2 && selectedEmployee && (
              <div className="md:flex gap-4">
                <div className="md:flex-1">
                  <FullCalendar
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    dateClick={(arg) => {
                      setSelectedDate(arg.dateStr);
                      setFlowStep(3);
                    }}
                    validRange={{ start: new Date().toISOString().split('T')[0] }}
                    height="auto"
                  />
                </div>
                <div className="md:w-80 mt-4 md:mt-0 p-3 border rounded">
                  <div className="font-medium">{selectedEmployee.nombre}</div>
                  <div className="text-sm text-gray-500 mt-2">Haz clic en un día para ver horas disponibles.</div>
                  <div className="mt-4">
                    <button onClick={() => setFlowStep(1)} className="text-sm text-gray-600 hover:underline">← Cambiar especialista</button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: horas */}
            {flowStep === 3 && selectedEmployee && selectedDate && (
              <div>
                <p className="text-sm text-gray-600 mb-4">Horas disponibles — {selectedDate}</p>
                <HourPicker
                  idEmpleado={String(selectedEmployee.id)}
                  fecha={selectedDate}
                  idservicio={selectedService.idServicio}
                  duracionServicio={Math.ceil((selectedService.duracion ?? 60) / 60)}
                  selectedHora={selectedHour ?? undefined}
                  onSelectHora={(h) => {
                    setSelectedHour(h);
                    setFlowStep(4);
                  }}
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setFlowStep(2)} className="px-3 py-2 rounded border">← Cambiar fecha</button>
                </div>
              </div>
            )}

            {/* STEP 4: confirm */}
            {flowStep === 4 && selectedEmployee && selectedDate && selectedHour && (
              <div className="p-4 border rounded bg-gray-50">
                <p><strong>Servicio:</strong> {selectedService.nombre}</p>
                <p><strong>Especialista:</strong> {selectedEmployee.nombre}</p>
                <p><strong>Fecha:</strong> {selectedDate}</p>
                <p><strong>Hora:</strong> {selectedHour}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setFlowStep(3)} className="px-3 py-2 rounded border">← Cambiar hora</button>
                  <button
                    onClick={handleConfirm}
                    disabled={loadingConfirm}
                    style={{ backgroundColor: '#73A954', color: '#fff' }}
                    className="px-4 py-2 rounded"
                  >
                    {loadingConfirm ? 'Guardando...' : 'Confirmar reserva'}
                  </button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            )}

            {/* STEP 5: éxito */}
            {flowStep === 5 && success && (
              <div className="text-center p-6">
                <h4 className="text-xl font-semibold" style={{ color: '#73A954' }}>¡Reserva creada!</h4>
                <p className="mt-2">Tu reserva para <strong>{selectedService.nombre}</strong> con <strong>{selectedEmployee?.nombre}</strong> el <strong>{selectedDate}</strong> a las <strong>{selectedHour}</strong> quedó registrada.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={closeFlow} style={{ backgroundColor: '#73A954', color: '#fff' }} className="px-4 py-2 rounded">Cerrar</button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Mobile: keep existing cards; clicking opens inline flow but in mobile it will occupy full width */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
          {filtered.map(s => (
            <div key={s.idServicio} className="bg-white rounded-lg shadow-sm p-4 flex-shrink-0 w-64 snap-start">
              <div className="w-full h-56 rounded overflow-hidden mb-4">
                <img
                  src={s.imagenUrl}
                  alt={s.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="font-semibold text-lg">{s.nombre}</div>
              <div className="text-gray-700 mt-1 mb-4">${s.precio.toFixed(2)}</div>

              <button
                style={{ borderColor: '#D8AFA7' }}
                className="w-full border rounded py-2 font-medium transition"
                onClick={() => openFlowForService(s)}
              >
                Agendar cita
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeServicesSection;
