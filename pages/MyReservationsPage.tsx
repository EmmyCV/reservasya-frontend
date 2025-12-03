import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import ClientCalendar from "../pages/ClientCalendar";

function MyReservationsPage() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservas = async () => {
      if (!user) {
        setReservas(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = String(user.id);

        // Intento genérico sobre campos posibles
        const tryQuery = async (field: string) => {
          try {
            const { data, error } = await supabase
              .from("reserva")
              .select("*")
              .eq(field, userId)
              .order("fecha", { ascending: false })
              .order("hora", { ascending: false });

            if (error) throw error;
            return data ?? [];
          } catch {
            return null;
          }
        };

        const possibleFields = [
          "idusuariocliente",
          "idcliente",
          "id_cliente",
          "cliente_id"
        ];

        let result: any[] | null = null;

        for (const field of possibleFields) {
          result = await tryQuery(field);
          if (result !== null) {
            setReservas(result);
            break;
          }
        }

        if (result === null) {
          throw new Error("No se encontró columna válida para el cliente.");
        }
      } catch (err) {
        console.error("Error cargando reservas:", err);
        setError("No se pudieron cargar tus reservas. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, [user]);

  if (loading) {
    return <div className="p-6">Cargando tus reservas...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: "#9F6A6A" }}>
        Mis Reservas
      </h2>

      {error && <p className="text-red-500">{error}</p>}

      {!user && (
        <p className="text-gray-700">Debes iniciar sesión para ver tus reservas.</p>
      )}

      {/* CALENDARIO DEL CLIENTE */}
      {user && <ClientCalendar />}

      {/* LISTADO DE RESERVAS */}
      {user && reservas && reservas.length === 0 && (
        <p className="text-gray-700">No tienes reservas registradas.</p>
      )}

      {user && reservas && reservas.length > 0 && (
        <>
          <h3 className="text-xl font-semibold" style={{ color: "#9F6A6A" }}>
            Historial de Reservas
          </h3>

          <div className="space-y-3">
            {reservas.map((r) => (
              <div
                key={r.idreserva}
                className="border rounded p-3 bg-white shadow-sm"
              >
                <p><strong>Fecha:</strong> {r.fecha}</p>
                <p><strong>Hora:</strong> {r.hora}</p>
                <p><strong>Estado:</strong> {r.estado}</p>
                <p className="text-sm text-gray-500">Empleado: {String(r.idempleado)}</p>
                <p className="text-sm text-gray-500">Servicio: {String(r.idservicio)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MyReservationsPage;
