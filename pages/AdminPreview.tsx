import React from 'react';
import AdminDashboard from './AdminDashboard';

const AdminPreview: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#fff4f6', padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <strong style={{ color: '#a33' }}>Vista previa pública — sin iniciar sesión</strong>
        <div style={{ color: '#555' }}>Esta es una vista pública del panel de administración. Algunas funciones que requieran autenticación pueden no funcionar.</div>
      </div>
      <AdminDashboard />
    </div>
  );
};

export default AdminPreview;
