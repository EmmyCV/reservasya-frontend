import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import StylistsManager from './StylistsManager';
import Spinner from '../Spinner';

interface Employee {
  id: string;
  nombre: string;
  telefono: string;
  rol: string;
}

interface EmployeeFormData {
  nombre: string;
  correo: string;
  telefono: string;
  password: string;
}

const initialFormData: EmployeeFormData = {
  nombre: '',
  correo: '',
  telefono: '',
  password: '',
};

const PersonnelManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('id, nombre, telefono, rol')
        .eq('rol', 'Empleado')
        .order('nombre');

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener los empleados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Registrar el usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.correo,
        password: formData.password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Crear el perfil en la tabla usuario
      const { error: profileError } = await supabase
        .from('usuario')
        .insert({
          id: authData.user.id,
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          rol: 'Empleado',
          usuarionuevo: true,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw new Error(profileError.message);

      handleCloseModal();
      fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar empleado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      try {
        const { error } = await supabase
          .from('usuario')
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchEmployees();
      } catch (err: any) {
        alert('Error al eliminar el empleado: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gestionar Empleados</h2>
          <button onClick={handleOpenModal} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus" style={{ backgroundColor: '#9F6A6A' }}>
            Añadir Empleado
          </button>
        </div>

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
                  <th className="py-3 px-4 text-left">Teléfono</th>
                  <th className="py-3 px-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-b">
                    <td className="py-3 px-4">{employee.nombre}</td>
                    <td className="py-3 px-4">{employee.telefono}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => handleDelete(employee.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Registrar Nuevo Empleado</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="nombre"
                placeholder="Nombre Completo"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="email"
                name="correo"
                placeholder="Correo Electrónico"
                required
                value={formData.correo}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="tel"
                name="telefono"
                placeholder="Teléfono"
                required
                value={formData.telefono}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="Contraseña Inicial"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres. El empleado podrá cambiarla después.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded"
                  style={{ backgroundColor: submitting ? '#cccccc' : '#9F6A6A' }}
                >
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Personal y Recursos Humanos</h2>
        <p className="text-gray-600 mb-4">Gestión de perfiles de empleados, roles y permisos.</p>
        <StylistsManager />
      </div>
    </div>
  );
};

export default PersonnelManager;

