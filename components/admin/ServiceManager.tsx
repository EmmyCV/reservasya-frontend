
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Servicio } from '../../types';
import Spinner from '../Spinner';

const ServiceManager: React.FC = () => {
    const [services, setServices] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Servicio>>({});

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('Servicio').select('*').order('nombre');
            if (error) throw error;
            setServices(data || []);
        } catch (err: any) {
            setError('Failed to fetch services.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleOpenModal = (service: Partial<Servicio> = {}) => {
        setCurrentService(service);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentService({});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const serviceData = {
            nombre: currentService.nombre,
            descripcion: currentService.descripcion,
            duracion: currentService.duracion,
            precio: currentService.precio,
        };

        try {
            let response;
            if (currentService.idServicio) {
                // Update
                response = await supabase.from('Servicio').update(serviceData).eq('idServicio', currentService.idServicio);
            } else {
                // Insert
                response = await supabase.from('Servicio').insert(serviceData);
            }
            if (response.error) throw response.error;

            handleCloseModal();
            fetchServices();
        } catch (err: any) {
            alert('Failed to save service: ' + err.message);
        }
    };

    const handleDelete = async (idServicio: number) => {
        if (window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            try {
                const { error } = await supabase.from('Servicio').delete().eq('idServicio', idServicio);
                if (error) throw error;
                fetchServices();
            } catch (err: any) {
                alert('Failed to delete service: ' + err.message);
            }
        }
    };

    if (loading) return <div className="flex justify-center"><Spinner /></div>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manage Services</h2>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus">
                    Add New Service
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-4 text-left">Name</th>
                            <th className="py-3 px-4 text-left">Duration (min)</th>
                            <th className="py-3 px-4 text-left">Price ($)</th>
                            <th className="py-3 px-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(s => (
                            <tr key={s.idServicio} className="border-b">
                                <td className="py-3 px-4">{s.nombre}</td>
                                <td className="py-3 px-4">{s.duracion}</td>
                                <td className="py-3 px-4">{s.precio.toFixed(2)}</td>
                                <td className="py-3 px-4 flex gap-2">
                                    <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline text-sm">Edit</button>
                                    <button onClick={() => handleDelete(s.idServicio)} className="text-red-600 hover:underline text-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{currentService.idServicio ? 'Edit Service' : 'Add New Service'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input type="text" placeholder="Name" required value={currentService.nombre || ''} onChange={e => setCurrentService({...currentService, nombre: e.target.value})} className="w-full p-2 border rounded"/>
                            <textarea placeholder="Description" value={currentService.descripcion || ''} onChange={e => setCurrentService({...currentService, descripcion: e.target.value})} className="w-full p-2 border rounded"></textarea>
                            <input type="number" placeholder="Duration (minutes)" required value={currentService.duracion || ''} onChange={e => setCurrentService({...currentService, duracion: parseInt(e.target.value)})} className="w-full p-2 border rounded"/>
                            <input type="number" step="0.01" placeholder="Price" required value={currentService.precio || ''} onChange={e => setCurrentService({...currentService, precio: parseFloat(e.target.value)})} className="w-full p-2 border rounded"/>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceManager;
