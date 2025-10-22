import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from '../Spinner';

const ClientsManager: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('usuario').select('*').eq('rol', 'Cliente').order('nombre');
        if (error) throw error;
        setClients((data as any[]) || []);
      } catch (err) {
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center"><Spinner /></div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Clientes</h2>
      {clients.length === 0 ? (
        <p className="text-gray-500">No hay clientes registrados.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map(c => (
            <li key={c.idUsuario} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{c.nombre}</div>
                <div className="text-sm text-gray-500">{c.correo}</div>
              </div>
              <div className="text-sm text-gray-600">{c.telefono}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientsManager;
