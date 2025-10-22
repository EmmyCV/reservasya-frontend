import React from 'react';

const ReportsManager: React.FC = () => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Reportes y Análisis</h2>
      <p className="text-gray-600">Informes de ventas, métricas de ocupación y rendimiento por empleado. (En construcción)</p>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div className="p-3 border rounded bg-gray-50">Ventas por servicio (gráfico)</div>
        <div className="p-3 border rounded bg-gray-50">Ocupación y ratio de reservas</div>
      </div>
    </div>
  );
};

export default ReportsManager;
