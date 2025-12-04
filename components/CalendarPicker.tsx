import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

/* =======================================================
   UTILIDADES
======================================================= */
const formatYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date, b: Date) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

const isBefore = (a: Date, b: Date) =>
  startOfDay(a).getTime() < startOfDay(b).getTime();

/* =======================================================
   COMPONENTE PRINCIPAL
======================================================= */
interface CalendarPickerProps {
  selectedDate?: string;
  onSelectDate: (fecha: string) => void;
  specialistId: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  specialistId,
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()));
  const [diasDisponibles, setDiasDisponibles] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  /* =======================================================
       CARGAR DÍAS DISPONIBLES DEL MES
  ======================================================== */
  useEffect(() => {
    if (!specialistId) {
      setDiasDisponibles([]);
      return;
    }

    const cargarDias = async () => {
      setLoading(true);
      try {
        const { data: horarioResp } = await supabase
          .from("empleado_horario")
          .select("horario(horainicio, horafin)")
          .eq("idusuarioempleado", specialistId)
          .single();

        if (!horarioResp?.horario) {
          setDiasDisponibles([]);
          setLoading(false);
          return;
        }

        const h = Array.isArray(horarioResp.horario)
          ? horarioResp.horario[0]
          : horarioResp.horario;

        const horaInicio = Number(h.horainicio.split(":")[0]);
        const horaFin = Number(h.horafin.split(":")[0]);
        const totalHoras = horaFin - horaInicio;

        const firstDay = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1
        );
        const lastDay = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        );

        // Obtener reservas del mes
        const { data: reservas } = await supabase
          .from("reserva")
          .select("fecha, hora, idservicio")
          .eq("idempleado", specialistId)
          .neq("estado", "cancelada")
          .gte("fecha", formatYYYYMMDD(firstDay))
          .lte("fecha", formatYYYYMMDD(lastDay));

        const serviciosIds = [
          ...new Set(reservas.map((r) => r.idservicio).filter(Boolean)),
        ];

        const servicioMap: Record<number, number> = {};

        if (serviciosIds.length) {
          const { data: svData } = await supabase
            .from("servicio")
            .select("idservicio, duracion")
            .in("idservicio", serviciosIds);

          svData.forEach((s) => {
            servicioMap[s.idservicio] = s.duracion || 60;
          });
        }

        const horasOcupadasPorDia: Record<string, Set<number>> = {};

        reservas.forEach((r) => {
          const fecha = r.fecha;
          const hora = Number(r.hora.split(":")[0]);
          const duracion = Math.ceil((servicioMap[r.idservicio] || 60) / 60);

          if (!horasOcupadasPorDia[fecha]) {
            horasOcupadasPorDia[fecha] = new Set();
          }

          for (let i = 0; i < duracion; i++) {
            horasOcupadasPorDia[fecha].add(hora + i);
          }
        });

        const disponibles: Date[] = [];

        for (let d = 1; d <= lastDay.getDate(); d++) {
          const dateObj = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            d
          );
          const fechaStr = formatYYYYMMDD(dateObj);

          if (dateObj.getDay() === 1) continue; // NO TRABAJA LOS LUNES

          const ocupadas = horasOcupadasPorDia[fechaStr]?.size || 0;

          if (ocupadas < totalHoras) {
            disponibles.push(dateObj);
          }
        }

        setDiasDisponibles(disponibles);
      } catch (err) {
        console.error("Error en cargarDias:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarDias();
  }, [specialistId, currentMonth]);

  /* =======================================================
       NAVEGACIÓN ENTRE MESES
  ======================================================== */
  const goPrev = () => {
    const today = new Date();
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (currentMonth > minMonth) {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
      );
    }
  };

  const goNext = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  /* =======================================================
       MATRIZ DEL CALENDARIO (42 CELDAS)
  ======================================================== */
  const getCalendarMatrix = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();

    let jsDay = firstDay.getDay();
    const startOffset = (jsDay + 6) % 7;

    const days: { date: Date; currentMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDay - i),
        currentMonth: false,
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        currentMonth: true,
      });
    }

    let nextDay = 1;
    while (days.length < 42) {
      days.push({
        date: new Date(year, month + 1, nextDay++),
        currentMonth: false,
      });
    }

    return days;
  };

  const renderCalendarDays = () => {
    const today = startOfDay(new Date());
    const days = getCalendarMatrix();

    return days.map((d, idx) => {
      const fecha = d.date;
      const fechaStr = formatYYYYMMDD(fecha);

      const disponible = diasDisponibles.some((x) => isSameDay(x, fecha));
      const isPast = isBefore(fecha, today);
      const isMonday = fecha.getDay() === 1;

      let cls =
        "flex items-center justify-center border h-14 rounded-md text-sm font-semibold transition select-none";

      if (!d.currentMonth)
        cls += " bg-gray-100 text-gray-300";
      else if (isMonday)
        cls += " bg-gray-100 text-gray-400";
      else if (isPast)
        cls += " bg-gray-200 text-gray-400";
      else if (!disponible)
        cls += " bg-gray-200 text-gray-400 cursor-not-allowed";
      else if (selectedDate === fechaStr)
        cls += " bg-green-600 text-white";
      else
        cls +=
          " bg-green-300 text-gray-900 hover:bg-green-400 cursor-pointer";

      return (
        <div
          key={idx}
          className={cls}
          onClick={
            !d.currentMonth || isPast || isMonday || !disponible
              ? undefined
              : () => onSelectDate(fechaStr)
          }
        >
          {fecha.getDate()}
        </div>
      );
    });
  };

  /* =======================================================
       UI
  ======================================================== */
  return (
    <div className="p-4 bg-white rounded-xl shadow-md w-full max-w-lg">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <button
          className="px-3 py-1 bg-gray-200 rounded-md"
          onClick={goPrev}
        >
          {"<"}
        </button>

        <h2 className="text-lg font-bold capitalize">
          {currentMonth.toLocaleString("es-CO", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button
          className="px-3 py-1 bg-gray-200 rounded-md"
          onClick={goNext}
        >
          {">"}
        </button>
      </div>

      {/* DÍAS DE LA SEMANA */}
      <div className="grid grid-cols-7 text-center font-semibold text-gray-600 mb-2">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mié</div>
        <div>Jue</div>
        <div>Vie</div>
        <div>Sáb</div>
        <div>Dom</div>
      </div>

      {/* CUADRÍCULA */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 min-h-[350px]">
        {loading ? (
          <div className="col-span-7 text-center py-8">
            Cargando calendario...
          </div>
        ) : (
          renderCalendarDays()
        )}
      </div>
    </div>
  );
};

export default CalendarPicker;
