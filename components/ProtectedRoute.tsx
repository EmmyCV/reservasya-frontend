import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// CORRECCIÓN: Se añade explícitamente la extensión .tsx
import { useAuth } from '../contexts/AuthContext.tsx';
// CORRECCIÓN: Se añade explícitamente la extensión .tsx
import Spinner from './Spinner.tsx'; // Asumo que el Spinner está en el mismo nivel


interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}


const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  // CORRECCIÓN: Usar las propiedades correctas del AuthContext: user, role, isLoading
  const { user, role, isLoading } = useAuth();
  const location = useLocation();


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }


  // 1. Verificar Autenticación
  // CORRECCIÓN: Usamos 'user' en lugar de 'session'
  if (!user) {
    // Si no hay usuario autenticado, redirigir al login.
    // Se mantiene el state para indicar la página de origen.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
 
  // 2. Verificar Autorización (Rol)
  // CORRECCIÓN: Usamos 'role' (que es un string) en lugar de profile.rol
  if (role && !allowedRoles.includes(role)) {
    // Si el rol existe pero no está permitido para esta ruta, redirigir.
    // Redirigimos a la raíz (HomePage) o podrías redirigir a una página de "No Autorizado".
    return <Navigate to="/" replace />;
  }
 
  // Si el usuario está autenticado Y el rol es válido, se permite el acceso.
  return <>{children}</>;
};


export default ProtectedRoute;
