
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Servicio } from '../types';
import Spinner from '../components/Spinner';
import BookingModal from '../components/BookingModal';

const ClientDashboard: React.FC = () => {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('Servicio').select('*');
        if (error) throw error;
        setServices(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch services.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Our Services</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.idServicio} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-primary mb-2">{service.nombre}</h2>
            <p className="text-text-secondary mb-4">{service.descripcion || 'No description available.'}</p>
            <div className="flex justify-between items-center text-sm text-text-primary mb-4">
              <span><strong>Duration:</strong> {service.duracion} minutes</span>
              <span><strong>Price:</strong> ${service.precio.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setSelectedService(service)}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-focus transition-colors"
            >
              Book Now
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
