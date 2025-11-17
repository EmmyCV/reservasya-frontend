
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Servicio } from '../../types';
import Spinner from '../Spinner';

const ServiceManager: React.FC = () => {

    // Helpers for duration handling
    const formatHoursToInterval = (hours: number) => {
        const totalSeconds = Math.round(hours * 3600);
        const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const ss = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`; // e.g. '01:30:00'
    };
    const [services, setServices] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Servicio>>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Nombre del bucket de Storage en Supabase. Cambia si tu bucket tiene otro nombre.
    const STORAGE_BUCKET = 'servicios';

   const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
        // Obtener servicios sin alias y mapear manualmente los campos al modelo `Servicio`
        const { data, error } = await supabase
            .from('servicio')
            .select('idservicio, nombreservicio, descripcion, duracion, precio, imagen_url, tipo')
            .order('nombreservicio');

        if (error) {
            console.error('Supabase error fetching servicios:', error);
            throw error;
        }

        // Convertir los nombres de columnas de la DB a los del frontend
        const formattedData = (data || []).map((s: any) => ({
            idServicio: s.idservicio,
            nombre: s.nombreservicio,
            descripcion: s.descripcion,
            duracion: s.duracion,
            precio: s.precio,
            imagenUrl: s.imagen_url,
            tipo: s.tipo,
        })) as Servicio[];

        setServices(formattedData);
    } catch (err: any) {
        console.error('Error en fetchServices:', err);
        setError(err?.message || JSON.stringify(err) || 'Error al obtener los servicios.');
    } finally {
        setLoading(false);
    }
}, []);


    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleOpenModal = (service: Partial<Servicio> = {}) => {
        setCurrentService(service);
        setSelectedFile(null);
        setPreviewUrl(service.imagenUrl || null);
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
            // duracion in hours as number in the UI
            duracion: currentService.duracion,
            precio: currentService.precio,
            imagenUrl: currentService.imagenUrl,
            tipo: currentService.tipo,
        };

        // If a file was selected, upload it to Supabase Storage first
        try {
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
                serviceData.imagenUrl = urlData.publicUrl;
            }
        } catch (err: any) {
            alert('Error al subir la imagen: ' + err.message);
            return;
        }

        try {
            let response;

            // Convert duration to interval string 'HH:MM:SS' before saving
            const duracionToSave = typeof serviceData.duracion === 'number'
                ? formatHoursToInterval(serviceData.duracion)
                : serviceData.duracion;

            if (currentService.idServicio) {
                // Update
                response = await supabase.from('servicio').update({
                    nombreservicio: serviceData.nombre,
                    descripcion: serviceData.descripcion,
                    duracion: duracionToSave,
                    precio: serviceData.precio,
                    imagen_url: serviceData.imagenUrl,
                    tipo: serviceData.tipo,
                }).eq('idservicio', currentService.idServicio);

            } else {
                // Insert
                response = await supabase.from('servicio').insert([{
                    nombreservicio: serviceData.nombre,
                    descripcion: serviceData.descripcion,
                    duracion: duracionToSave,
                    precio: serviceData.precio,
                    imagen_url: serviceData.imagenUrl,
                    tipo: serviceData.tipo,
                }] as any);

            }
            if (response.error) throw response.error;

            handleCloseModal();
            fetchServices();
        } catch (err: any) {
            alert('Error al guardar el servicio: ' + err.message);
        }
    };

    const handleDelete = async (idServicio: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.')) {
            try {
                const { error } = await supabase.from('servicio').delete().eq('idservicio', idServicio);
                if (error) throw error;
                fetchServices();
            } catch (err: any) {
                alert('Error al eliminar el servicio: ' + err.message);
            }
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Gestionar Servicios</h2>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus">
                    Añadir Servicio
                </button>
            </div>

            {/* Show error banner but keep the page interactive so admin can still add services */}
            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                ) : (
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                                    <tr>
                                            <th className="py-3 px-4 text-left">Nombre</th>
                                            <th className="py-3 px-4 text-left">Tipo</th>
                                            <th className="py-3 px-4 text-left">Duración (horas)</th>
                                            <th className="py-3 px-4 text-left">Precio ($)</th>
                                            <th className="py-3 px-4 text-left">Acciones</th>
                                        </tr>
                        </thead>
                        <tbody>
                            {services.map(s => (
                                <tr key={s.idServicio} className="border-b">
                                    <td className="py-3 px-4">{s.nombre}</td>
                                    <td className="py-3 px-4">{s.tipo || '—'}</td>
                                    <td className="py-3 px-4">{typeof s.duracion === 'number' ? s.duracion.toFixed(2) + ' h' : String(s.duracion)}</td>
                                    <td className="py-3 px-4">{s.precio.toFixed(2)}</td>
                                    <td className="py-3 px-4 flex gap-2">
                                        <button onClick={() => handleOpenModal(s)} className="text-blue-600 hover:underline text-sm">Editar</button>
                                        <button onClick={() => handleDelete(s.idServicio)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{currentService.idServicio ? 'Editar Servicio' : 'Añadir Servicio'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input type="text" placeholder="Nombre" required value={currentService.nombre || ''} onChange={e => setCurrentService({...currentService, nombre: e.target.value})} className="w-full p-2 border rounded"/>
                            <textarea placeholder="Descripción" value={currentService.descripcion || ''} onChange={e => setCurrentService({...currentService, descripcion: e.target.value})} className="w-full p-2 border rounded"></textarea>
                            <input type="number" step="0.25" min="0" placeholder="Duración (Horas)" required value={currentService.duracion || ''} onChange={e => setCurrentService({...currentService, duracion: parseFloat(e.target.value)})} className="w-full p-2 border rounded"/>
                            <input type="number" step="0.01" placeholder="Precio" required value={currentService.precio || ''} onChange={e => setCurrentService({...currentService, precio: parseFloat(e.target.value)})} className="w-full p-2 border rounded"/>
                            
                            <select value={currentService.tipo || ''} onChange={e => setCurrentService({...currentService, tipo: e.target.value})} className="w-full p-2 border rounded">
                                <option value="">Tipo de Servicio</option>
                                <option value="Cabello">Cabello</option>
                                <option value="Pestañas">Pestañas</option>
                                <option value="Depilación">Depilación</option>
                                <option value="Maquillaje y Peinado">Maquillaje y Peinado</option>
                                <option value="Manos y Pies">Manos y Pies</option>
                            </select>

                            <label className="block text-sm font-medium text-gray-700">Imagen del servicio</label>
                            <input type="file" accept="image/*" onChange={e => {
                                const f = e.target.files?.[0] || null;
                                setSelectedFile(f);
                                if (f) {
                                    setPreviewUrl(URL.createObjectURL(f));
                                } else {
                                    setPreviewUrl(currentService.imagenUrl || null);
                                }
                            }} className="w-full p-2 border rounded" />

                            {previewUrl && (
                                <div className="mt-2">
                                    <img src={previewUrl} alt="Preview" className="w-32 h-20 object-cover rounded" />
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceManager;
