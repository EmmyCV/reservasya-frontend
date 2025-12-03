import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../services/supabase";

interface Employee {
  id: string;
  nombre: string;
  telefono: string;
}

interface DeleteEmployeePanelProps {
  onClose: () => void;
}

const DeleteEmployeePanel: React.FC<DeleteEmployeePanelProps> = ({ onClose }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [pendingReservations, setPendingReservations] = useState<any[]>([]);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationsError, setReservationsError] = useState<string>("");

  // Traer todos los empleados
  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from("usuario")
        .select("id, nombre, telefono")
        .eq("rol", "Empleado")
        .order("nombre");

      if (error) throw error;
      setEmployees(data as Employee[] || []);
    } catch (err: any) {
      console.error("Error cargando empleados:", err.message);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Traer reservas pendientes del empleado seleccionado
  useEffect(() => {
    if (!selected) {
      setEmployeeData(null);
      setPendingReservations([]);
      setReservationsError("");
      return;
    }

    const fetchEmployeeInfo = async () => {
      setLoadingReservations(true);
      setReservationsError("");
      try {
        // Buscar empleado seleccionado
        const empleado = employees.find((e) => e.id === selected);
        setEmployeeData(empleado || null);

        // Consultar reservas pendientes con join a Cliente y Servicio
        const { data: reservas, error } = await supabase
          .from("reserva")
          .select(`
            *,
            Cliente:usuario!reserva_idusuariocliente_fkey ( nombre ),
            Servicio:servicio!reserva_idservicio_fkey ( nombreservicio )
          `)
          .eq("idempleado", selected)
          .eq("estado", "pendiente");

        if (error) throw error;

        setPendingReservations(reservas || []);
        console.log("Reservas pendientes:", reservas);
      } catch (err: any) {
        console.error("Error cargando reservas:", err.message);
        setPendingReservations([]);
        setReservationsError("No se pudieron cargar las reservas pendientes.");
      } finally {
        setLoadingReservations(false);
      }
    };

    fetchEmployeeInfo();
  }, [selected, employees]);

  // Reasignar reservas
  const handleReassign = async () => {
    if (!reassignTo) return;
    setLoadingReservations(true);
    try {
      const { error } = await supabase
        .from("reserva")
        .update({ idempleado: reassignTo })
        .eq("idempleado", selected)
        .eq("estado", "pendiente");

      if (error) throw error;

      setPendingReservations([]);
      alert("Reservas reasignadas correctamente.");
    } catch (err: any) {
      console.error("Error reasignando reservas:", err.message);
      alert("Error reasignando reservas.");
    } finally {
      setLoadingReservations(false);
    }
  };

  // Eliminar empleado solo si no tiene reservas pendientes
  const handleDelete = async () => {
    if (pendingReservations.length > 0) {
      alert("El empleado tiene reservas pendientes. Debe reasignarlas primero.");
      return;
    }

    setLoadingEmployees(true);
    try {
      const { error } = await supabase
        .from("usuario")
        .delete()
        .eq("id", selected);

      if (error) throw error;

      alert("Empleado eliminado correctamente.");
      fetchEmployees();
      onClose();
    } catch (err: any) {
      console.error("Error eliminando empleado:", err.message);
      alert("Error eliminando empleado.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Eliminar Empleado</h2>

        <label className="font-semibold">Seleccione un empleado:</label>
        <select
          className="w-full border mt-1 p-2 rounded-lg"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Seleccione...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.nombre}
            </option>
          ))}
        </select>

        {employeeData && (
          <div className="mt-4 border p-4 rounded-lg bg-gray-50">
            <h3 className="font-semibold">Información del empleado</h3>
            <p><strong>Nombre:</strong> {employeeData.nombre}</p>
            <p><strong>Teléfono:</strong> {employeeData.telefono}</p>
          </div>
        )}

        {loadingEmployees && <p className="mt-4 text-gray-600">Cargando empleados...</p>}
        {loadingReservations && <p className="mt-4 text-gray-600">Cargando reservas...</p>}
        {reservationsError && (
          <p className="mt-2 text-red-600 font-semibold">{reservationsError}</p>
        )}

        {pendingReservations.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-100 border rounded-lg">
            <p className="font-semibold text-yellow-800">
              Este empleado tiene {pendingReservations.length} reservas pendientes.
            </p>

            <label className="font-semibold">Reasignar a:</label>
            <select
              className="w-full border mt-1 p-2 rounded-lg"
              onChange={(e) => setReassignTo(e.target.value)}
              value={reassignTo}
            >
              <option value="">Seleccione...</option>
              {employees
                .filter((e) => e.id !== selected)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </option>
                ))}
            </select>

            <button
              onClick={handleReassign}
              disabled={!reassignTo}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Reasignar Reservas
            </button>
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={pendingReservations.length > 0}
          className="mt-6 w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
        >
          Eliminar Empleado
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default DeleteEmployeePanel;

