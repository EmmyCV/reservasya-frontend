import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Horario {
  idhorario: string;
  tipo_turno: string;
  activo: boolean;
}

interface Reserva {
  fecha: string;
  hora: string;
  estado: string;
}

const EmployeeSchedule: React.FC = () => {
  const { user } = useAuth();

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // 1️⃣ Obtener horarios del empleado
      const { data: horariosData, error: hError } = await supabase
        .from("empleado_horario")
        .select("idhorario, tipo_turno, activo")
        .eq("idusuarioempleado", user.id);

      if (hError) {
        console.error("❌ Error obteniendo horarios:", hError);
        return;
      }

      setHorarios(horariosData || []);

      // 2️⃣ Obtener reservas del empleado (NO idempleado)
      const { data: reservasData, error: rError } = await supabase
        .from("reserva")
        .select("fecha, hora, estado")
        .eq("idempleado", user.id)
        .in("estado", ["pendiente"]);

      if (rError) {
        console.error("❌ Error obteniendo reservas:", rError);
        return;
      }

      setReservas(reservasData || []);
    };

    loadData();
  }, [user]);

  return (
    <section className="bg-white rounded-xl shadow p-6">

      <h2 className="text-xl font-semibold mb-4">Mi Horario</h2>

      <table className="w-full border mb-6">
        <thead className="bg-gray-200">
          <tr>
            
            <th className="p-2 border">Turno</th>
            <th className="p-2 border">Activo</th>
          </tr>
        </thead>
        <tbody>
          {horarios.map((t, idx) => (
            <tr key={idx}>
              
              <td className="p-2 border">{t.tipo_turno}</td>
              <td className="p-2 border">
                {t.activo ? "✔ Activo" : "✖ Inactivo"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-2">Mis Reservas</h2>

      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">Fecha</th>
            <th className="p-2 border">Hora</th>
            <th className="p-2 border">Estado</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map((r, idx) => (
            <tr key={idx}>
              <td className="p-2 border">{r.fecha}</td>
              <td className="p-2 border">{r.hora}</td>
              <td className="p-2 border">{r.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </section>
  );
};

export default EmployeeSchedule;
