
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary">
              GlamourReserve
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {session && profile ? (
              <>
                {profile.rol === 'Cliente' && (
                  <>
                    <Link to="/dashboard" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                    <Link to="/my-reservations" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">My Reservations</Link>
                  </>
                )}
                {(profile.rol === 'Admin' || profile.rol === 'Recepcionista') && (
                  <Link to="/admin" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Admin Panel</Link>
                )}
                <span className="text-gray-700 text-sm">Hi, {profile.nombre}!</span>
                <button
                  onClick={handleSignOut}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-focus transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-focus transition-colors">
                  Sign Up
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
