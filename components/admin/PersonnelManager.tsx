import React from 'react';
import StylistsManager from './StylistsManager';

const PersonnelManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Personal y Recursos Humanos</h2>
      <p className="text-gray-600 mb-4">Gestión de perfiles de empleados, roles y permisos.</p>
      <StylistsManager />
    </div>
  );
};

export default PersonnelManager;
