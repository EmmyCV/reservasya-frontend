
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Servicio } from '../types';
import Spinner from '../components/Spinner';
import BookingModal from '../components/BookingModal';

const ClientDashboard: React.FC = () => {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const location = useLocation();
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
        try {
        // Request raw DB columns and map them to the frontend-friendly names
        const { data, error } = await supabase
          .from('servicio')
          .select('idservicio, nombreservicio, descripcion, duracion, precio, imagen_url');
        if (error) throw error;
        const mapped = ((data as any[]) || []).map((s: any) => ({
          idServicio: s.idservicio ?? s.id,
          nombre: s.nombreservicio ?? s.nombre,
          descripcion: s.descripcion,
          duracion: s.duracion,
          precio: s.precio,
          imagenUrl: s.imagen_url ?? s.imagenUrl ?? null,
        } as Servicio));
        setServices(mapped);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch services.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    console.log('[ClientDashboard] mounted');
  }, []);

  // Mostrar mensaje si venimos con state desde el login/registro
  useEffect(() => {
    const state: any = (location && (location as any).state) || {};
    if (state && state.message) {
      setFlash(state.message as string);
      const t = setTimeout(() => setFlash(null), 4000);
      return () => clearTimeout(t);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <Spinner />
      </div>
    );
  }

  // Mostrar banner temporal si hay flash
  const FlashBanner = () => (
    flash ? (
      <div className="max-w-4xl mx-auto my-4 p-3 rounded-md bg-green-100 text-green-800 text-center">
        {flash}
      </div>
    ) : null
  );

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div>
      <FlashBanner />
      <h1 className="text-3xl font-bold mb-6 text-text-primary"> Nuestros servicios</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.idServicio} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-primary mb-2">{service.nombre}</h2>
            <p className="text-text-secondary mb-4">{service.descripcion || 'No description available.'}</p>
            <div className="flex justify-between items-center text-sm text-text-primary mb-4">
              <span><strong>Duración:</strong> {service.duracion} horas</span>
              <span><strong>Precio:</strong> ${service.precio.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setSelectedService(service)}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-focus transition-colors"
            >
              Agendar Cita
            </button>
          </div>
        ))}
      </div>

      {selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
