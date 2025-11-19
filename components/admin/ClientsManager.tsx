import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from '../Spinner';

const ClientsManager: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch function callable on demand
  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      // Run the Supabase query with a timeout to avoid hanging indefinitely
      const query = supabase
        .from('usuario')
        .select('id,nombre,rol,telefono')
        .eq('rol', 'Cliente')
        .order('nombre');

      const timeoutMs = 10000;
      const res: any = await Promise.race([
        query,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
      ]);

      const data = res?.data;
      const fetchErr = res?.error;
      if (fetchErr) throw fetchErr;
      console.log('[ClientsManager] fetched', Array.isArray(data) ? data.length : 'no-array', data?.slice ? data.slice(0,5) : data);
      setClients((data as any[]) || []);
    } catch (err) {
      console.error('[ClientsManager] fetch error', err);
      setClients([]);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Clientes</h2>
      <div className="mb-4">
        <button
          onClick={async () => {
            console.log('[ClientsManager] Listar button clicked, showList=', showList);
            // Toggle: if already showing, hide; otherwise fetch+show
            if (showList) {
              setShowList(false);
              return;
            }
            // show spinner quickly
            setLoading(true);
            await fetchClients();
            setShowList(true);
          }}
          className="px-3 py-2 bg-primary text-white rounded-md shadow-sm hover:opacity-90"
        >
          {showList ? 'Ocultar clientes' : 'Listar clientes'}
        </button>
      </div>

      {loading && <div className="flex justify-center"><Spinner /></div>}

      {error && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700">
          <div className="font-medium">Error cargando clientes</div>
          <div className="text-sm mt-1">{error}</div>
          <div className="mt-2">
            <button
              onClick={() => fetchClients()}
              className="px-3 py-1 bg-primary text-white rounded-md"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {(!showList || (!loading && clients.length === 0)) && !loading && !showList && !error && (
        <p className="text-gray-500">Haz clic en "Listar clientes" para cargar los clientes registrados.</p>
      )}

      {showList && !loading && !error && (
        clients.length === 0 ? (
          <p className="text-gray-500">No hay clientes registrados.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map(c => (
              <li key={c.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-sm text-gray-500">{c.rol}</div>
                </div>
                <div className="text-sm text-gray-600">{c.telefono || '—'}</div>
              </li>
            ))}
          </ul>
        )
      )}
      {/* Debug: raw JSON response for easier inspection */}
      {showList && !loading && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Respuesta (debug)</h3>
          <pre className="bg-gray-100 p-3 rounded text-xs max-h-48 overflow-auto">{JSON.stringify(clients, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ClientsManager;
