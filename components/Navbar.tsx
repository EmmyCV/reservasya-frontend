import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Use an absolute path from the project root for static assets to avoid
// occasional relative-resolution issues during HMR.
import logoRosa from '/src/assets/logorosa.png';

const Navbar: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md" style={{ backgroundColor: '#FFF5F8' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold" style={{ color: '#9F6A6A' }}>
              <img src={logoRosa} alt="Logo" style={{ height: '80px' }} />
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            {user && role ? (
              <>
                {role === 'Cliente' && (
                  <>
                    <div className="flex items-center space-x-4">
                      <Link to="/dashboard" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Catálogo de Servicios</Link>
                      <Link to="/my-reservations" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Mis Reservas</Link>
                    </div>
                  </>
                )}
                {(['Admin', 'Administrador'] as string[]).includes(role) && (
                  <Link to="/admin" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Panel de Administración</Link>
                )}

                {/* User Profile Section */}
                <div className="flex items-center space-x-4 ml-6">
                  {/* Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-lg" style={{ backgroundColor: '#9F6A6A' }}>
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                  
                  {/* User Info & Actions */}
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">{user.email ?? 'Usuario'}</span>
                      <span className="text-xs text-gray-500">{role}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-600 hover:text-primary text-sm font-medium flex items-center space-x-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Salir</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 px-3 py-2 rounded-md text-sm font-medium" style={{ color: '#9F6A6A' }}>
                  Iniciar sesión
                </Link>
                <Link to="/register" style={{ backgroundColor: '#9F6A6A' }} className="text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-colors">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
