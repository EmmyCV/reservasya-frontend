import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Servicio } from '../../types';
import Spinner from '../Spinner';

const ServiceManager: React.FC = () => {
    const formatHoursToInterval = (hours: number) => {
        const totalSeconds = Math.round(hours * 3600);
        const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const ss = (totalSeconds % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    };

    const STORAGE_BUCKET = "servicios";
    const [services, setServices] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Servicio>>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("servicio")
                .select("idservicio, nombreservicio, descripcion, duracion, precio, imagen_url, tipo")
                .order("nombreservicio");

            if (error) throw error;

            const formatted = (data || []).map((s: any) => ({
                idServicio: s.idservicio,
                nombre: s.nombreservicio,
                descripcion: s.descripcion,
                duracion: s.duracion,
                precio: s.precio,
                imagenUrl: s.imagen_url, // <-- Guardamos solo filename
                tipo: s.tipo
            }));

            setServices(formatted);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleOpenModal = async (service: Partial<Servicio> = {}) => {
        setCurrentService(service);
        setSelectedFile(null);
        if (service.imagenUrl) {
            try {
                const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(service.imagenUrl as string);
                if (pub.data?.publicUrl) {
                    setPreviewUrl(pub.data.publicUrl);
                } else {
                    // fallback: create signed url (short-lived)
                    try {
                        const signed = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(service.imagenUrl as string, 60);
                        setPreviewUrl(signed.data?.signedUrl || null);
                    } catch (e) {
                        setPreviewUrl(null);
                    }
                }
            } catch (err) {
                setPreviewUrl(null);
            }
        } else {
            setPreviewUrl(null);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let imageFilename = currentService.imagenUrl || null;

        try {
            if (selectedFile) {
                const ext = selectedFile.name.split(".").pop();
                const filename = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(filename, selectedFile);

                if (uploadError) throw uploadError;

                imageFilename = filename; // <-- SOLO GUARDAMOS EL NOMBRE
            }
        } catch (err: any) {
            alert("Error subiendo imagen: " + err.message);
            return;
        }

        try {
            const duracionToSave = typeof currentService.duracion === "number"
                ? formatHoursToInterval(currentService.duracion)
                : currentService.duracion;

            let response;

            if (currentService.idServicio) {
                response = await supabase
                    .from("servicio")
                    .update({
                        nombreservicio: currentService.nombre,
                        descripcion: currentService.descripcion,
                        duracion: duracionToSave,
                        precio: currentService.precio,
                        imagen_url: imageFilename,
                        tipo: currentService.tipo
                    })
                    .eq("idservicio", currentService.idServicio);
            } else {
                response = await supabase
                    .from("servicio")
                    .insert([{
                        nombreservicio: currentService.nombre,
                        descripcion: currentService.descripcion,
                        duracion: duracionToSave,
                        precio: currentService.precio,
                        imagen_url: imageFilename,
                        tipo: currentService.tipo
                    }]);
            }

            if (response.error) throw response.error;

            setIsModalOpen(false);
            fetchServices();
        } catch (err: any) {
            alert("Error guardando: " + err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Eliminar servicio?")) return;

        const { error } = await supabase.from("servicio").delete().eq("idservicio", id);
        if (error) alert(error.message);
        else fetchServices();
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Gestionar Servicios</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus"
                >
                    Añadir Servicio
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-3 px-4">Nombre</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Duración</th>
                            <th className="py-3 px-4">Precio</th>
                            <th className="py-3 px-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(s => (
                            <tr key={s.idServicio} className="border-b">
                                <td className="py-3 px-4">{s.nombre}</td>
                                <td className="py-3 px-4">{s.tipo}</td>
                                <td className="py-3 px-4">{String(s.duracion)}</td>
                                <td className="py-3 px-4">${s.precio}</td>
                                <td className="py-3 px-4 flex gap-2">
                                    <button onClick={() => handleOpenModal(s)} className="text-blue-600">Editar</button>
                                    <button onClick={() => handleDelete(s.idServicio)} className="text-red-600">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">
                            {currentService.idServicio ? "Editar Servicio" : "Añadir Servicio"}
                        </h3>

                        <form onSubmit={handleSave} className="space-y-4">
                            <input className="w-full p-2 border rounded"
                                type="text"
                                placeholder="Nombre"
                                required
                                value={currentService.nombre || ""}
                                onChange={e => setCurrentService({ ...currentService, nombre: e.target.value })}
                            />

                            <textarea className="w-full p-2 border rounded"
                                placeholder="Descripción"
                                value={currentService.descripcion || ""}
                                onChange={e => setCurrentService({ ...currentService, descripcion: e.target.value })}
                            />

                            <input className="w-full p-2 border rounded"
                                type="number"
                                step="0.25"
                                min="0"
                                placeholder="Duración (Horas)"
                                required
                                value={currentService.duracion || ""}
                                onChange={e => setCurrentService({ ...currentService, duracion: parseFloat(e.target.value) })}
                            />

                            <input className="w-full p-2 border rounded"
                                type="number"
                                step="0.01"
                                placeholder="Precio"
                                required
                                value={currentService.precio || ""}
                                onChange={e => setCurrentService({ ...currentService, precio: parseFloat(e.target.value) })}
                            />

                            <select
                                className="w-full p-2 border rounded"
                                value={currentService.tipo || ""}
                                onChange={e => setCurrentService({ ...currentService, tipo: e.target.value })}
                            >
                                <option value="">Tipo de Servicio</option>
                                <option value="Cabello">Cabello</option>
                                <option value="Pestañas">Pestañas</option>
                                <option value="Depilación">Depilación</option>
                                <option value="Maquillaje y Peinado">Maquillaje y Peinado</option>
                                <option value="Manos y Pies">Manos y Pies</option>
                            </select>

                            <input
                                className="w-full p-2 border rounded"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    setSelectedFile(f);
                                    setPreviewUrl(f ? URL.createObjectURL(f) : null);
                                }}
                            />

                            {previewUrl && (
                                <img src={previewUrl} className="w-32 h-20 mt-2 object-cover rounded" />
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 rounded"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceManager;
