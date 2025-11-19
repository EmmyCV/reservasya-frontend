import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Servicio } from '../types';

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
        // Normalize duration to minutes
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

        // Try public URL first
        const pub = supabase.storage.from('servicios').getPublicUrl(it.imagenKey);
        let url = pub.data?.publicUrl || '';

        // If no public or empty, try signed URL (60s)
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

  return (
    <section className="py-12 px-4 md:px-16 bg-white">
      <h2 className="text-3xl font-bold mb-8">Servicios</h2>

      <div className="flex gap-6 border-b mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`pb-3 px-2 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab
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

      {/* Desktop carousel */}
      <div className="relative hidden md:flex items-center">
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

              <button style={{ borderColor: '#D8AFA7' }} className="w-full border rounded py-2 font-medium transition" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D8AFA7'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'black'; }}>
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
      </div>

      {/* Mobile: horizontal single-row carousel (scrollable) */}
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

              <button style={{ borderColor: '#D8AFA7' }} className="w-full border rounded py-2 font-medium transition" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D8AFA7'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'black'; }}>
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
