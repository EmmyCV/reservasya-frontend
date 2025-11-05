import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Use an absolute path from the project root for static assets to avoid
// occasional relative-resolution issues during HMR.
import logoRosa from '/src/assets/logorosa.png';

const Navbar: React.FC = () => {
  const { session, profile, signOut } = useAuth();
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
          <div className="flex items-center space-x-4">
            {session && profile ? (
              <>
                {profile?.rol === 'Cliente' && (
                  <>
                    <Link to="/dashboard" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Tablero</Link>
                    <Link to="/my-reservations" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Mis Reservas</Link>
                  </>
                )}
                {(['Admin', 'Administrador', 'Recepcionista'] as string[]).includes(profile?.rol as string) && (
                  <Link to="/admin" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Panel de Administración</Link>
                )}
                <span className="text-gray-700 text-sm">¡Hola, {profile?.nombre ?? 'usuario'}!</span>
                <button
                  onClick={handleSignOut}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-focus transition-colors"
                >
                  Cerrar sesión
                </button>
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
