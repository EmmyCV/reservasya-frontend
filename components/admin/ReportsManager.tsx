import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Reserva } from '../../types';
import Spinner from '../admin/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';

// Colores fijos para los estados "realizada" y "cancelada"
const FIXED_COLORS: Record<string, string> = {
    'realizada': '#4CAF50', // Verde
    'cancelada': '#F44336', // Rojo
};
// Colores rotatorios para los diferentes empleados
const EMPLOYEE_COLORS = ['#FF9800', '#2196F3', '#9C27B0', '#FF5722', '#607D8B'];


const ReportsManager: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');
  // [NUEVO ESTADO] La fecha de referencia para el reporte.
  const [reportDate, setReportDate] = useState(new Date()); 
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [NUEVA FUNCIÓN] Maneja el cambio de filtro y la fecha de referencia.
  const handleFilterChange = (filter: 'day' | 'week' | 'month') => {
    setTimeFilter(filter);
    // Para 'Día' y 'Semana', siempre volvemos a la fecha actual.
    if (filter !== 'month') {
        setReportDate(new Date());
    }
  };
  
  // [NUEVA FUNCIÓN] Navega al mes anterior.
  const handlePreviousMonth = () => {
    setReportDate(prevDate => {
        // Crea una nueva fecha un mes antes del 1er día del mes actual.
        const prevMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1);
        return prevMonth;
    });
  };

  // [NUEVA FUNCIÓN] Navega al mes siguiente.
  const handleNextMonth = () => {
    setReportDate(prevDate => {
        // Crea una nueva fecha un mes después del 1er día del mes actual.
        const nextMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
        return nextMonth;
    });
  };

  // =====================================================
  // Obtener reservas según el filtro (Actualizado)
  // =====================================================
  // [DEPENDENCIA ACTUALIZADA] Ahora depende de timeFilter Y reportDate
  useEffect(() => {
    const fetchReservas = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase.from('reserva').select('*');

        const anchorDate = reportDate; // Usamos reportDate como fecha de anclaje.
        
        if (timeFilter === 'day') {
          // Día: Filtra por la fecha exacta de anchorDate
          const fechaStr = format(anchorDate, 'yyyy-MM-dd');
          query = query.eq('fecha', fechaStr);
        } else if (timeFilter === 'week') {
          // Semana: Filtra por la semana que contiene anchorDate
          const primerDia = startOfWeek(anchorDate, { weekStartsOn: 1 });
          const ultimoDia = endOfWeek(anchorDate, { weekStartsOn: 1 });
          query = query.gte('fecha', format(primerDia, 'yyyy-MM-dd'))
                        .lte('fecha', format(ultimoDia, 'yyyy-MM-dd'));
        } else if (timeFilter === 'month') {
          // Mes: Filtra por el mes de anchorDate
          const primerDia = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
          const ultimoDia = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
          query = query.gte('fecha', format(primerDia, 'yyyy-MM-dd'))
                        .lte('fecha', format(ultimoDia, 'yyyy-MM-dd'));
        }

        const { data, error } = await query;
        if (error) throw error;
        setReservas(data || []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar reservas.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservas();
  }, [timeFilter, reportDate]); // Se agregó reportDate como dependencia

  // =====================================================
  // Preparar datos para el gráfico
  // =====================================================
  // [CORRECCIÓN]: Se usa 'idEmpleado' en lugar de 'idempleado'
  const empleadosMap = Array.from(new Set(reservas.map(r => r.idEmpleado))).filter(Boolean);
  
  const colorMap: Record<string, string> = { ...FIXED_COLORS };
  empleadosMap.forEach((emp, index) => {
    colorMap[emp] = EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
  });

  const groupedData: Record<string, Record<string, number>> = {};
  reservas.forEach(r => {
    const fecha = format(new Date(r.fecha), 'yyyy-MM-dd');
    if (!groupedData[fecha]) groupedData[fecha] = {};
    
    // [CORRECCIÓN]: Se usa 'idEmpleado' en lugar de 'idempleado'
    const key = r.estado === 'realizada' ? 'realizada' :
                r.estado === 'cancelada' ? 'cancelada' :
                r.idEmpleado;

    if (key) {
        groupedData[fecha][key] = (groupedData[fecha][key] || 0) + 1;
    }
  });

  const chartData = Object.entries(groupedData).map(([fecha, counts]) => ({
    fecha,
    ...counts,
  }));

  // =====================================================
  // Renderizado
  // =====================================================
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Reportes de Reservas</h2>
      <p className="text-gray-600 mb-4">
        Visualiza reservas por día, semana o mes con colores según el estado y empleado.
      </p>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleFilterChange('day')}
          className={`px-3 py-1 rounded ${timeFilter === 'day' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Día
        </button>
        <button
          onClick={() => handleFilterChange('week')}
          className={`px-3 py-1 rounded ${timeFilter === 'week' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Semana
        </button>
        <button
          onClick={() => handleFilterChange('month')}
          className={`px-3 py-1 rounded ${timeFilter === 'month' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Mes
        </button>
      </div>

      {/* [NUEVA UI] Navegación de Meses */}
      {timeFilter === 'month' && (
          <div className="flex items-center gap-4 mb-4">
              <button
                  onClick={handlePreviousMonth}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                  &lt; Anterior
              </button>
              <span className="font-semibold text-lg capitalize">
                  {/* Muestra el nombre del mes y año actual de la vista */}
                  {format(reportDate, 'MMMM yyyy')}
              </span>
              <button
                  onClick={handleNextMonth}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                  Siguiente &gt;
              </button>
          </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 inline-block" style={{ backgroundColor: FIXED_COLORS.realizada }}></span> Realizadas
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 inline-block" style={{ backgroundColor: FIXED_COLORS.cancelada }}></span> Canceladas
        </div>
        {empleadosMap.map(emp => (
          <div key={emp} className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block" style={{ backgroundColor: colorMap[emp] }}></span> Empleado {emp} (Pendientes)
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : chartData.length === 0 ? (
        <p>No hay reservas para este periodo.</p>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="fecha" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {/* Barras fijas para realizadas y canceladas */}
            <Bar dataKey="realizada" stackId="a" fill={FIXED_COLORS.realizada} />
            <Bar dataKey="cancelada" stackId="a" fill={FIXED_COLORS.cancelada} />
            {/* Barras por empleado para pendientes */}
            {empleadosMap.map(emp => (
              <Bar key={emp} dataKey={emp} stackId="a" fill={colorMap[emp]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ReportsManager;