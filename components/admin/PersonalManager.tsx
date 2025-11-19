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
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // -------- NUEVOS ESTADOS -------- //
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Servicios
  const [services, setServices] = useState<{ id: number | string; nombre: string }[]>([]);
  const [selectedServices, setSelectedServices] = useState<(number | string)[]>([]);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  // Horarios
  const [horarios, setHorarios] = useState<{ idhorario: number | string; nombre: string; horainicio: string; horafin: string }[]>([]);
  const [selectedHorario, setSelectedHorario] = useState<number | string | null>(null);
  const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);

  // -------------------------------- //

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
    setSuccess(null);

    if (!formData.nombre || !formData.correo || !formData.password) {
      setError('El nombre, correo y contraseña son obligatorios.');
      setSubmitting(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.correo,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre.trim(),
            telefono: formData.telefono.trim(),
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData?.user) throw new Error('No se pudo crear el usuario');

      const { error: updateError } = await supabase
        .from('usuario')
        .update({ rol: 'Empleado' })
        .eq('id', authData.user.id);

      if (updateError) throw new Error(updateError.message);

      setSuccess('Empleado registrado exitosamente');
      handleCloseModal();
      await fetchEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar empleado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar empleado?')) {
      try {
        const { error } = await supabase
          .from('usuario')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await fetchEmployees();
      } catch (err: any) {
        alert('Error al eliminar el empleado: ' + err.message);
      }
    }
  };

  // ============ SERVICIOS ============= //

  const handleOpenServicios = async (id: string) => {
    setSelectedEmployeeId(id);

    // Cargar todos los servicios desde DB (nombres reales)
    const { data: servList, error: servError } = await supabase
      .from('servicio')
      .select('idservicio, nombreservicio')
      .order('nombreservicio');

    if (servError) {
      console.error('Error cargando servicios', servError);
      setServices([]);
    } else {
      setServices((servList || []).map((s: any) => ({
        id: s.idservicio ?? s.id ?? s.id_servicio,
        nombre: s.nombreservicio ?? s.nombre ?? s.nombre_servicio ?? 'Servicio'
      })));
    }

    // Cargar servicios asignados al empleado (usa idusuarioempleado e idservicio)
    const { data: empServData, error: empServErr } = await supabase
      .from('empleado_servicio')
      .select('idservicio')
      .eq('idusuarioempleado', id);

    if (empServErr) {
      console.error('Error cargando servicios del empleado', empServErr);
      setSelectedServices([]);
    } else {
      const selected = (empServData || []).map((r: any) => r.idservicio).filter(Boolean);
      setSelectedServices(selected);
    }

    setIsServicesModalOpen(true);
  };

  const handleSaveServicios = async () => {
    if (!selectedEmployeeId) return;
    try {
      // borrar existentes del empleado (usando idusuarioempleado)
      const { error: delErr } = await supabase
        .from('empleado_servicio')
        .delete()
        .eq('idusuarioempleado', selectedEmployeeId);

      if (delErr) throw delErr;

      // insertar seleccionados (idusuarioempleado / idservicio)
      const inserts = selectedServices.map(s => ({
        idusuarioempleado: selectedEmployeeId,
        idservicio: s,
      }));

      if (inserts.length) {
        const { error: insErr } = await supabase.from('empleado_servicio').insert(inserts);
        if (insErr) throw insErr;
      }

      setIsServicesModalOpen(false);
      setSuccess('Servicios actualizados');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      console.error(err);
      alert('Error guardando servicios: ' + (err.message || JSON.stringify(err)));
    }
  };

  // ============ HORARIO ============= //

  const handleOpenHorario = async (id: string) => {
    setSelectedEmployeeId(id);

    // traer horarios (tabla horario) con tus columnas reales: idhorario, nombre, horainicio, horafin
    const { data: horariosList, error: horariosErr } = await supabase
      .from('horario')
      .select('idhorario, nombre, horainicio, horafin')
      .order('idhorario');

    if (horariosErr) {
      console.error('Error cargando horarios', horariosErr);
      setHorarios([]);
    } else {
      setHorarios(horariosList || []);
    }

    // traer horario asignado al empleado (usa idusuarioempleado / idhorario)
    const { data: empHorarioData, error: empHorarioErr } = await supabase
      .from('empleado_horario')
      .select('idhorario, tipo_turno, activo')
      .eq('idusuarioempleado', id)
      .limit(1)
      .maybeSingle();

    if (empHorarioErr) {
      console.error('Error cargando empleado_horario', empHorarioErr);
      setSelectedHorario(null);
    } else {
      setSelectedHorario(empHorarioData?.idhorario ?? null);
    }

    setIsHorarioModalOpen(true);
  };

  const handleSaveHorario = async () => {
    if (!selectedEmployeeId) return;
    if (!selectedHorario) {
      alert('Selecciona un horario.');
      return;
    }

    try {
      // eliminar asignaciones previas (por simplicidad: un empleado -> un idhorario base)
      const { error: delErr } = await supabase
        .from('empleado_horario')
        .delete()
        .eq('idusuarioempleado', selectedEmployeeId);

      if (delErr) throw delErr;

      // buscar nombre del turno en la lista de horarios para guardar en tipo_turno si existe
      const selectedHorarioObj = horarios.find(h => String(h.idhorario) === String(selectedHorario));

      const insertRow: any = {
        idusuarioempleado: selectedEmployeeId,
        idhorario: selectedHorario,
        activo: true
      };

      if (selectedHorarioObj) {
        // si quieres almacenar tipo_turno en la tabla empleado_horario
        insertRow.tipo_turno = selectedHorarioObj.nombre;
      }

      const { error: insErr } = await supabase
        .from('empleado_horario')
        .insert(insertRow);

      if (insErr) throw insErr;

      setIsHorarioModalOpen(false);
      setSuccess('Horario asignado');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      console.error(err);
      alert('Error asignando horario: ' + (err.message || JSON.stringify(err)));
    }
  };

  // ================================== //

  return (
    <div className="space-y-6">

      {/* LISTA DE EMPLEADOS */}
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gestionar Empleados</h2>
          <button
            onClick={handleOpenModal}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus"
            style={{ backgroundColor: '#9F6A6A' }}
          >
            Añadir Empleado
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
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
                    <td className="py-3 px-4 flex gap-3">

                      {/* BOTÓN SERVICIOS */}
                      <button
                        onClick={() => handleOpenServicios(employee.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Servicios
                      </button>

                      {/* BOTÓN HORARIO */}
                      <button
                        onClick={() => handleOpenHorario(employee.id)}
                        className="text-purple-600 hover:underline text-sm"
                      >
                        Horario
                      </button>

                      {/* ELIMINAR */}
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Eliminar
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL REGISTRO EMPLEADO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">

            <h3 className="text-lg font-bold mb-4">Registrar Nuevo Empleado</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" name="nombre" placeholder="Nombre Completo" required value={formData.nombre} onChange={handleChange} className="w-full p-2 border rounded" />

              <input type="email" name="correo" placeholder="Correo Electrónico" required value={formData.correo} onChange={handleChange} className="w-full p-2 border rounded" />

              <input type="tel" name="telefono" placeholder="Teléfono" required value={formData.telefono} onChange={handleChange} className="w-full p-2 border rounded" />

              <input type="password" name="password" placeholder="Contraseña Inicial" required minLength={6} value={formData.password} onChange={handleChange} className="w-full p-2 border rounded" />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-white rounded" style={{ backgroundColor: submitting ? '#ccc' : '#9F6A6A' }}>
                  {submitting ? 'Registrando...' : 'Registrar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL SERVICIOS */}
      {isServicesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Servicios del Empleado</h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {services.map(serv => (
                <label key={serv.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedServices.map(String).includes(String(serv.id))}
                    onChange={() =>
                      setSelectedServices(prev =>
                        prev.map(String).includes(String(serv.id))
                          ? prev.filter(s => String(s) !== String(serv.id))
                          : [...prev, serv.id]
                      )
                    }
                  />
                  {serv.nombre}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setIsServicesModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#9F6A6A' }} onClick={handleSaveServicios}>
                Guardar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL HORARIO */}
      {isHorarioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Asignar Horario</h3>

            <div className="space-y-2">
              {horarios.map(h => (
                <label key={h.idhorario} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="horario"
                    value={String(h.idhorario)}
                    checked={String(selectedHorario) === String(h.idhorario)}
                    onChange={() => setSelectedHorario(h.idhorario)}
                  />
                  {h.nombre} ({h.horainicio} - {h.horafin})
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setIsHorarioModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#9F6A6A' }} onClick={handleSaveHorario}>
                Guardar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RRHH EXTRA */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Personal y Recursos Humanos</h2>
        <p className="text-gray-600 mb-4">Gestión de perfiles de empleados, roles y permisos.</p>
        <StylistsManager />
      </div>

    </div>
  );
};

export default PersonnelManager;
