import React from 'react';
import AllReservations from './AllReservations';

const AgendaManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Agenda y Planificación</h2>
      <p className="text-gray-600 mb-4">Vista consolidada de reservas y calendario del equipo. (Calendar view próximamente)</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <AllReservations />
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold mb-2">Calendario (vista previa)</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">Componente de calendario pendiente</div>
        </div>
      </div>
    </div>
  );
};

export default AgendaManager;
