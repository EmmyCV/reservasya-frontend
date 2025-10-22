import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="text-center py-16">
            <h1 className="text-6xl font-extrabold mb-4" style={{ color: '#9F6A6A' }}>404</h1>
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#9F6A6A' }}>Página no encontrada</h2>
            <p className="text-lg text-text-secondary mb-8">
                Lo sentimos, la página que buscas no existe.
            </p>
            <Link
                to="/"
                style={{ backgroundColor: '#9F6A6A' }}
                className="text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-colors"
            >
                Ir a la página principal
            </Link>
        </div>
    );
};

export default NotFoundPage;
