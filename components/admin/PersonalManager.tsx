import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from './Spinner';
import DeleteEmployeePanel from './DeleteEmployeePanel';

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

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [services, setServices] = useState<{ id: number | string; nombre: string }[]>([]);
  const [selectedServices, setSelectedServices] = useState<(number | string)[]>([]);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  const [horarios, setHorarios] = useState<{ idhorario: number | string; nombre: string; horainicio: string; horafin: string }[]>([]);
  const [selectedHorario, setSelectedHorario] = useState<number | string | null>(null);
  const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);

  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);

  // -------- FETCH EMPLEADOS ACTIVOS --------
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('id, nombre, telefono, rol')
        .eq('rol', 'Empleado')
        .eq('activo', true)
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

  // -------- MODAL REGISTRO --------
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
        .update({ rol: 'Empleado', activo: true })
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

  // -------- ELIMINAR EMPLEADO --------
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

  // -------- SERVICIOS --------
  const handleOpenServicios = async (id: string) => {
    setSelectedEmployeeId(id);

    const { data: servList } = await supabase
      .from('servicio')
      .select('idservicio, nombreservicio')
      .order('nombreservicio');

    setServices((servList || []).map((s: any) => ({
      id: s.idservicio ?? s.id,
      nombre: s.nombreservicio ?? s.nombre ?? 'Servicio'
    })));

    const { data: empServData } = await supabase
      .from('empleado_servicio')
      .select('idservicio')
      .eq('idusuarioempleado', id);

    setSelectedServices((empServData || []).map((r: any) => r.idservicio).filter(Boolean));
    setIsServicesModalOpen(true);
  };

  const handleSaveServicios = async () => {
    if (!selectedEmployeeId) return;
    try {
      await supabase.from('empleado_servicio').delete().eq('idusuarioempleado', selectedEmployeeId);
      if (selectedServices.length) {
        await supabase.from('empleado_servicio').insert(
          selectedServices.map(s => ({ idusuarioempleado: selectedEmployeeId, idservicio: s }))
        );
      }
      setIsServicesModalOpen(false);
      setSuccess('Servicios actualizados');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      console.error(err);
      alert('Error guardando servicios: ' + (err.message || JSON.stringify(err)));
    }
  };

  // -------- HORARIOS --------
  const handleOpenHorario = async (id: string) => {
    setSelectedEmployeeId(id);

    const { data: horariosList } = await supabase
      .from('horario')
      .select('idhorario, nombre, horainicio, horafin')
      .order('idhorario');

    setHorarios(horariosList || []);

    const { data: empHorarioData } = await supabase
      .from('empleado_horario')
      .select('idhorario')
      .eq('idusuarioempleado', id)
      .limit(1)
      .maybeSingle();

    setSelectedHorario(empHorarioData?.idhorario ?? null);
    setIsHorarioModalOpen(true);
  };

  const handleSaveHorario = async () => {
    if (!selectedEmployeeId || !selectedHorario) {
      alert('Selecciona un horario.');
      return;
    }

    try {
      const { data: currentHorarioData } = await supabase
        .from('empleado_horario')
        .select('idhorario')
        .eq('idusuarioempleado', selectedEmployeeId)
        .maybeSingle();

      const currentHorarioId = currentHorarioData?.idhorario;

      if (currentHorarioId) {
        const { data: reservas } = await supabase
          .from('reserva')
          .select('*')
          .eq('idempleado', selectedEmployeeId)
          .eq('idhorario', currentHorarioId);

        if (reservas && reservas.length > 0) {
          const confirmReasign = window.confirm(
            `El empleado tiene ${reservas.length} reserva(s) en el horario actual. ¿Deseas reasignarlas al nuevo horario?`
          );

          if (!confirmReasign) return;

          for (const r of reservas) {
            await supabase
              .from('reserva')
              .update({ idhorario: selectedHorario })
              .eq('id', r.id);
          }
        }
      }

      await supabase.from('empleado_horario').delete().eq('idusuarioempleado', selectedEmployeeId);

      const selectedHorarioObj = horarios.find(h => String(h.idhorario) === String(selectedHorario));
      const insertRow: any = { idusuarioempleado: selectedEmployeeId, idhorario: selectedHorario, activo: true };
      if (selectedHorarioObj) insertRow.tipo_turno = selectedHorarioObj.nombre;

      await supabase.from('empleado_horario').insert(insertRow);
      setIsHorarioModalOpen(false);
      setSuccess('Horario actualizado y reservas reasignadas si existían.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Error asignando horario: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gestionar Empleados</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <button onClick={handleOpenModal} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-focus" style={{ backgroundColor: '#9F6A6A' }}>Añadir Empleado</button>
            <button onClick={() => setIsDeletePanelOpen(true)} className="mt-0 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700" style={{ minWidth: 140 }}>Eliminar Empleado</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left">Nombre</th>
                  <th className="py-3 px-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-b">
                    <td className="py-3 px-4">{employee.nombre}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => handleOpenServicios(employee.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 text-sm">Servicios</button>
                      <button onClick={() => handleOpenHorario(employee.id)} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 text-sm">Horario</button>
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
              <input type="text" name="nombre" placeholder="Nombre Completo" required value={formData.nombre} onChange={handleChange} className="w-full p-2 border rounded" />
              <input type="email" name="correo" placeholder="Correo Electrónico" required value={formData.correo} onChange={handleChange} className="w-full p-2 border rounded" />
              <input type="tel" name="telefono" placeholder="Teléfono" required value={formData.telefono} onChange={handleChange} className="w-full p-2 border rounded" />
              <input type="password" name="password" placeholder="Contraseña Inicial" required minLength={6} value={formData.password} onChange={handleChange} className="w-full p-2 border rounded" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-white rounded" style={{ backgroundColor: submitting ? '#ccc' : '#9F6A6A' }}>{submitting ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isServicesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Servicios del Empleado</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {services.map(serv => (
                <label key={serv.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedServices.includes(serv.id)} onChange={() => setSelectedServices(prev => prev.includes(serv.id) ? prev.filter(s => s !== serv.id) : [...prev, serv.id])} />
                  {serv.nombre}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setIsServicesModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#9F6A6A' }} onClick={handleSaveServicios}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {isHorarioModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Asignar Horario</h3>
            <div className="space-y-2">
              {horarios.map(h => (
                <label key={h.idhorario} className="flex items-center gap-2">
                  <input type="radio" name="horario" value={String(h.idhorario)} checked={String(selectedHorario) === String(h.idhorario)} onChange={() => setSelectedHorario(h.idhorario)} />
                  {h.nombre} ({h.horainicio} - {h.horafin})
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setIsHorarioModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 text-white rounded" style={{ backgroundColor: '#9F6A6A' }} onClick={handleSaveHorario}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {isDeletePanelOpen && (
        <DeleteEmployeePanel onClose={() => setIsDeletePanelOpen(false)} />
      )}
    </div>
  );
};

export default PersonnelManager;
