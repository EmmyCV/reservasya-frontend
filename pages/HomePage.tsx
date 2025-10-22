import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
    const { profile } = useAuth();

    const getDashboardLink = () => {
        if (!profile) return "/login";
        switch (profile.rol) {
            case 'Admin':
            case 'Recepcionista':
                return "/admin";
            case 'Cliente':
                return "/dashboard";
            default:
                return "/login";
        }
    };

    return (
        <div className="text-center py-16 px-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">
                ¡Los mejores <span style={{ color: '#9F6A6A' }}>Cambios de look!</span>
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
                Reserva tu cita y descubre nuestra magia
            </p>
            <div className="flex justify-center">
                <Link
                    to={getDashboardLink()}
                        style={{ backgroundColor: '#9F6A6A' }}
                    className="text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-transform transform hover:scale-105 shadow-lg text-lg"
                >
                    {profile ? 'Ir al Panel' : 'Reservar cita'}
                </Link>
            </div>
            <div className="mt-16">
                <img src="https://picsum.photos/1200/400?random=1" alt="Beauty Salon" className="rounded-lg shadow-2xl mx-auto"/>
            </div>
        </div>
    );
};

export default HomePage;
