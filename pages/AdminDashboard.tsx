
import React, { useState } from 'react';
import ServiceManager from '../components/admin/ServiceManager';
import AllReservations from '../components/admin/AllReservations';
// Placeholders for other admin components
// import ScheduleManager from '../components/admin/ScheduleManager';
// import AssignmentManager from '../components/admin/AssignmentManager';

type AdminTab = 'reservations' | 'services' | 'schedules' | 'assignments';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reservations');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reservations':
        return <AllReservations />;
      case 'services':
        return <ServiceManager />;
      case 'schedules':
        return <div className="p-4 bg-white rounded-lg shadow"><h2 className="text-xl font-bold">Schedule Management</h2><p className="mt-2 text-gray-600">This feature is under construction.</p></div>;
      case 'assignments':
        return <div className="p-4 bg-white rounded-lg shadow"><h2 className="text-xl font-bold">Staff Assignments</h2><p className="mt-2 text-gray-600">This feature is under construction.</p></div>;
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
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Admin Dashboard</h1>
      <div className="mb-6 flex space-x-2 border-b">
        <TabButton tab="reservations" label="All Reservations" />
        <TabButton tab="services" label="Manage Services" />
        <TabButton tab="schedules" label="Manage Schedules" />
        <TabButton tab="assignments" label="Manage Assignments" />
      </div>
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
