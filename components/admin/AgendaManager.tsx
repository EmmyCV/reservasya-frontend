import React from 'react';
import SimpleCalendar from './SimpleCalendar';

const AgendaManager: React.FC = () => {
  // Definir colores para estados
  const estadoColors = {
    realizada: '#73A954', // verde
    cancelada: '#D9534F', // rojo
    pendiente: '#007BFF', // azul genérico para pendiente, se puede variar por empleado
  };

  // Ejemplo de leyenda para mostrar
  const leyenda = [
    { label: 'Realizada', color: estadoColors.realizada },
    { label: 'Cancelada', color: estadoColors.cancelada },
    { label: 'Pendiente utiliza un color diferente según el Empleado', color: estadoColors.pendiente + ' (varía por empleado)' },
  ];

  return (
    <div className="min-h-screen p-4">
      <h2 className="text-xl font-bold mb-2">Agenda y Planificación</h2>
      <p className="text-gray-600 mb-4">
        Vista consolidada de reservas y calendario del equipo. Los colores indican el estado de cada reserva.
      </p>

      {/* Leyenda de estados */}
      <div className="flex gap-4 mb-4">
        {leyenda.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              style={{ backgroundColor: item.color }}
              className="w-5 h-5 rounded-full border"
            />
            <span className="text-gray-700 text-sm">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Contenedor full screen para el calendario */}
      <div className="w-full h-screen border rounded-lg overflow-hidden">
        <SimpleCalendar  />
      </div>
    </div>
  );
};

export default AgendaManager;

