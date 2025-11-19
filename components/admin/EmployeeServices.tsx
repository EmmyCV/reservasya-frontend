import React, { useEffect, useState } from "react";
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface EmployeeService {
  id: number;
  nombre: string;
}

const EmployeeServices: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<EmployeeService[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("empleado_servicio")
        .select("servicio(idservicio, nombreservicio)")
        .eq("idusuarioempleado", user.id);

      if (error) console.error(error);

      setServices(
        data?.map((s: any) => ({
          id: s.servicio.idservicio,
          nombre: s.servicio.nombreservicio,
        })) || []
      );
    };

    fetchServices();
  }, [user]);

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Servicios que realizas</h2>

      <div className="grid md:grid-cols-2 gap-3">
        {services.map((serv) => (
          <div
            key={serv.id}
            className="p-3 border rounded-lg flex justify-between items-center"
          >
            <span>{serv.nombre}</span>
            <span className="text-green-600 font-semibold">✔</span>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <p className="text-gray-500">No tienes servicios asignados.</p>
      )}
    </section>
  );
};

export default EmployeeServices;
