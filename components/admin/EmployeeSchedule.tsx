import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface Turno {
  dia: string;
  turno: string;
  estado: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const EmployeeSchedule: React.FC = () => {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchSchedule = async () => {
      const { data, error } = await supabase
        .from("empleado_horario")
        .select("dia, turno, estado")
        .eq("idusuarioempleado", user.id);

      if (error) console.error(error);
      setTurnos(data || []);
    };

    fetchSchedule();
  }, [user]);

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Horario laboral</h2>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Día</th>
              <th className="p-2 border">Turno</th>
              <th className="p-2 border">Estado</th>
            </tr>
          </thead>

          <tbody>
            {turnos.map((t, i) => (
              <tr key={i} className="text-center">
                <td className="p-2 border">{t.dia}</td>
                <td className="p-2 border">{t.turno}</td>
                <td
                  className={`p-2 border ${
                    t.estado === "Disponible"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {t.estado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {turnos.length === 0 && (
          <p className="text-gray-500 mt-2">
            No tienes horario asignado aún.
          </p>
        )}
      </div>
    </section>
  );
};

export default EmployeeSchedule;
