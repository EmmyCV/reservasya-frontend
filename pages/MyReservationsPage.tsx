
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Reserva } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

const MyReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const fetchReservations = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Reserva')
        .select(`
          *,
          Servicio (*),
          Empleado:Usuario!Reserva_idEmpleado_fkey (*)
        `)
        .eq('idUsuarioCliente', profile.idUsuario)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });

      if (error) throw error;
      setReservations(data as any[] || []);
    } catch (err: any) {
      setError('Failed to fetch reservations.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = async (idReserva: number) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        const { error } = await supabase
          .from('Reserva')
          .update({ estado: 'cancelada' })
          .eq('idReserva', idReserva);
        
        if (error) throw error;
        // Refresh the list
        fetchReservations();
      } catch (err) {
        alert('Failed to cancel reservation.');
      }
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'activa': return 'bg-blue-100 text-blue-800';
      case 'realizada': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex justify-center mt-16"><Spinner /></div>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-text-primary">My Reservations</h1>
      {reservations.length === 0 ? (
        <p className="text-center text-text-secondary">You have no reservations yet.</p>
      ) : (
        <div className="space-y-4">
          {reservations.map(res => (
            <div key={res.idReserva} className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-primary">{res.Servicio.nombre}</h2>
                <p className="text-sm text-text-secondary">with {res.Empleado.nombre}</p>
                <p className="text-sm text-text-secondary">{new Date(res.fecha + 'T' + res.hora).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusChip(res.estado)}`}>
                  {res.estado}
                </span>
                {res.estado === 'activa' && (
                  <button onClick={() => handleCancel(res.idReserva)} className="bg-red-500 text-white text-xs px-3 py-1 rounded-md hover:bg-red-600">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservationsPage;
