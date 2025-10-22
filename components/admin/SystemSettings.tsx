import React from 'react';

const SystemSettings: React.FC = () => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Configuración general</h2>
      <p className="text-gray-600">Ajustes del sistema, personalización y parámetros globales. (En construcción)</p>
      <div className="mt-4 space-y-3">
        <div className="p-3 border rounded bg-gray-50">Zona horaria: <strong>America/Argentina/Buenos_Aires</strong></div>
        <div className="p-3 border rounded bg-gray-50">Formato de fecha: <strong>DD/MM/YYYY</strong></div>
      </div>
    </div>
  );
};

export default SystemSettings;
