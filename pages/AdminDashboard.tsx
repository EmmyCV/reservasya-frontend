import React, { useState } from 'react';
import ServiceManager from '../components/admin/ServiceManager';
import AllReservations from '../components/admin/AllReservations';
import ClientsManager from '../components/admin/ClientsManager';
import StylistsManager from '../components/admin/StylistsManager';
import AgendaManager from '../components/admin/AgendaManager';
import PersonnelManager from '../components/admin/PersonalManager';
import ReportsManager from '../components/admin/ReportsManager';

type AdminTab = 'agenda' | 'clients' | 'services' | 'personal' | 'reports' | 'settings';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('agenda');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agenda':
        return <AgendaManager />;
      case 'clients':
        return <ClientsManager />;
      case 'services':
        return <ServiceManager />;
      case 'personal':
        return <PersonnelManager />;
      case 'reports':
        return <ReportsManager />;
      
      default:
        return null;
    }
  };
  
  const TabButton: React.FC<{tab: AdminTab, label: string}> = ({ tab, label }) => (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {label}
      </button>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#9F6A6A' }}>Panel de Administración</h1>
      <div className="mb-6 -mx-4 px-4 border-b overflow-x-auto sm:overflow-visible">
        <div className="flex space-x-2 w-max sm:w-full">
          <TabButton tab="agenda" label="Agenda y Planificación" />
          <TabButton tab="clients" label="Clientes y CRM" />
          <TabButton tab="services" label="Catálogo de Servicios" />
          <TabButton tab="personal" label="Personal y RRHH" />
          <TabButton tab="reports" label="Reportes y Análisis" />
        </div>
      </div>
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
