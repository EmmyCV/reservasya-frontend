
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Reserva } from '../../types';
import Spinner from '../Spinner';

const AllReservations: React.FC = () => {
    const [reservations, setReservations] = useState<Reserva[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('reserva')
                .select(`
    *,
    Cliente:usuario!reserva_idcliente_fkey (*),
    Empleado:usuario!reserva_idempleado_fkey (*),
    Servicio:servicio!reserva_idservicio_fkey (*)
`)
;

            if (filterDate) {
                query = query.eq('fecha', filterDate);
            }
            
            const { data, error } = await query.order('fecha').order('hora');

            if (error) throw error;
            setReservations(data as any[] || []);
        } catch (err: any) {
            setError('Failed to fetch reservations.');
        } finally {
            setLoading(false);
        }
    }, [filterDate]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    const handleStatusChange = async (idReserva: number, newStatus: 'activa' | 'cancelada' | 'realizada') => {
        try {
            const { error } = await supabase.from('reserva').update({ estado: newStatus }).eq('idReserva', idReserva);
            if (error) throw error;
            fetchReservations();
        } catch (err) {
            alert('Failed to update status.');
        }
    };
    
    if (loading) return <div className="flex justify-center"><Spinner /></div>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Todas las Reservas</h2>
            <div className="mb-4">
                <label htmlFor="filterDate" className="mr-2">Filtrar por fecha:</label>
                <input type="date" id="filterDate" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded"/>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-2 px-3 text-left">Fecha y hora</th>
                            <th className="py-2 px-3 text-left">Cliente</th>
                            <th className="py-2 px-3 text-left">Servicio</th>
                            <th className="py-2 px-3 text-left">Empleado</th>
                            <th className="py-2 px-3 text-left">Estado</th>
                            <th className="py-2 px-3 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map(res => (
                            <tr key={res.idReserva} className="border-b">
                                <td className="py-2 px-3">{res.fecha} @ {res.hora}</td>
                                <td className="py-2 px-3">{res.Usuario?.nombre || 'N/A'}</td>
                                <td className="py-2 px-3">{res.Servicio?.nombre || 'N/A'}</td>
                                <td className="py-2 px-3">{res.Empleado?.nombre || 'N/A'}</td>
                                <td className="py-2 px-3">{res.estado}</td>
                                <td className="py-2 px-3">
                                    <select 
                                      value={res.estado} 
                                      onChange={(e) => handleStatusChange(res.idReserva, e.target.value as any)}
                                      className="p-1 border rounded text-xs"
                                    >
                                        <option value="activa">Activa</option>
                                        <option value="realizada">Realizada</option>
                                        <option value="cancelada">Cancelada</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {reservations.length === 0 && <p className="text-center p-4 text-gray-500">No se encontraron reservas para esta fecha.</p>}
            </div>
        </div>
    );
};

export default AllReservations;
