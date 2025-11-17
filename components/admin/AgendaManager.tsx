import React from 'react';
import AllReservations from './AllReservations';
import SimpleCalendar from './SimpleCalendar';

const AgendaManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Agenda y Planificación</h2>
      <p className="text-gray-600 mb-4">Vista consolidada de reservas y calendario del equipo.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <AllReservations />
        </div>
        <div>
          <SimpleCalendar />
        </div>
      </div>
    </div>
  );
};

export default AgendaManager;
