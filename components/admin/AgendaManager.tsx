import React from 'react';
import AllReservations from './AllReservations';
import SimpleCalendar from './SimpleCalendar';

const AgendaManager: React.FC = () => {
  return (
    <div className="min-h-screen">
      <h2 className="text-xl font-bold mb-4">Agenda y Planificación</h2>
      <p className="text-gray-600 mb-4">Vista consolidada de reservas y calendario del equipo.</p>
      {/* Contenedor full screen para el calendario */}
      <div className="w-full h-screen">
        <SimpleCalendar />
      </div>
    </div>
  );
};

export default AgendaManager;
