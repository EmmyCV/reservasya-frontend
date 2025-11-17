import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
    const { user, role } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Array de imágenes que rotan
    const images = [
        '/src/assets/unnamed.jpg',
        '/src/assets/unnamed (1).jpg',
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Cambiar cada 5 segundos

        return () => clearInterval(interval);
    }, [images.length]);

    const getDashboardLink = () => {
        if (!user) return "/login";
        switch (role) {
            case 'Administrador':
                return "/admin";
            case 'Cliente':
                return "/dashboard";
            default:
                return "/login";
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Carrusel Hero */}
            <div 
                className="relative w-full h-screen bg-cover bg-center flex items-center justify-start transition-all duration-1000"
                style={{
                    backgroundImage: `url('${images[currentImageIndex]}')`,
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                {/* Overlay oscuro para legibilidad */}
                <div className="absolute inset-0 bg-black/30"></div>

                {/* Contenido a la izquierda */}
                <div className="relative z-10 px-8 md:px-16 max-w-2xl">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
                        ¡Los mejores <br />
                        <span style={{ color: '#F0E0D4' }}>cambios de look!</span>
                    </h1>

                    <p className="text-lg text-gray-100 mb-8">
                        Reserva tu cita y descubre nuestra magia
                    </p>

                    <div className="flex gap-4">
                        <Link
                            to="/productos"
                            className="px-6 py-3 border-2 border-white text-white font-semibold rounded hover:bg-white hover:text-gray-800 transition"
                        >
                            Productos
                        </Link>
                        <Link
                            to={getDashboardLink()}
                            style={{ backgroundColor: '#9F6A6A' }}
                            className="px-6 py-3 text-white font-semibold rounded hover:opacity-90 transition"
                        >
                            Agendar Cita
                        </Link>
                    </div>
                </div>

                {/* Botones de navegación de carrusel */}
                <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition"
                >
                    ‹
                </button>
                <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition"
                >
                    ›
                </button>

                {/* Indicadores de página */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`w-3 h-3 rounded-full transition ${
                                i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
