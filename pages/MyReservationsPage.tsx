import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const MyReservationsPage: React.FC = () => {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservas = async () => {
      if (!user) {
        setReservas(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const userId = String(user.id);

        // Intentar consultas tolerantes: primero columna más esperada, sino alternativa
        const tryQueries = async (clientField: string) => {
          try {
            const { data, error } = await supabase
              .from('reserva')
              .select('*')
              .eq(clientField, userId)
              .order('fecha', { ascending: false });
            if (error) throw error;
            return data ?? [];
          } catch (e) {
            console.debug('[MyReservations] fallo consulta con campo', clientField, e);
            return null;
          }
        };

        // Probar nombres posibles de la columna cliente
        const tryFields = ['idusuariocliente', 'idcliente', 'id_cliente', 'cliente_id'];
        let result: any[] | null = null;
        for (const f of tryFields) {
          result = await tryQueries(f);
          if (result !== null) {
            // éxito
            setReservas(result);
            break;
          }
        }
        if (result === null) {
          throw new Error('No se pudo consultar reservas: columnas cliente no coinciden');
        }
      } catch (err: any) {
        console.error('Error cargando reservas:', err);
        setError('No se pudieron cargar tus reservas. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, [user]);

  if (loading) return <div className="p-6">Cargando tus reservas...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: '#9F6A6A' }}>Mis Reservas</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {!user && (
        <p className="text-gray-700">Debes iniciar sesión para ver tus reservas.</p>
      )}

      {user && reservas && reservas.length === 0 && (
        <p className="text-gray-700">No tienes reservas registradas.</p>
      )}

      {user && reservas && reservas.length > 0 && (
        <div className="space-y-3">
          {reservas.map(r => (
            <div key={r.idreserva} className="border rounded p-3 bg-white shadow-sm">
              <p><strong>Fecha:</strong> {r.fecha}</p>
              <p><strong>Hora:</strong> {r.hora}</p>
              <p><strong>Estado:</strong> {r.estado}</p>
              <p className="text-sm text-gray-500">Empleado: {String(r.idempleado)}</p>
              <p className="text-sm text-gray-500">Servicio: {String(r.idservicio)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservationsPage;