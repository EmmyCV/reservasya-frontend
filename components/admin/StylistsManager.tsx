import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from '../Spinner';

const StylistsManager: React.FC = () => {
  const [stylists, setStylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('usuario').select('*').eq('rol', 'Empleado').order('nombre');
        if (error) throw error;
        setStylists((data as any[]) || []);
      } catch (err) {
        setStylists([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center"><Spinner /></div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Estilistas</h2>
      {stylists.length === 0 ? (
        <p className="text-gray-500">No hay estilistas registrados.</p>
      ) : (
        <ul className="space-y-2">
          {stylists.map(s => (
            <li key={s.idUsuario} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{s.nombre}</div>
                <div className="text-sm text-gray-500">{s.correo}</div>
              </div>
              <div className="text-sm text-gray-600">{s.telefono}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StylistsManager;
