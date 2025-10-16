
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="text-center py-16">
            <h1 className="text-6xl font-extrabold text-primary mb-4">404</h1>
            <h2 className="text-3xl font-bold text-text-primary mb-2">Page Not Found</h2>
            <p className="text-lg text-text-secondary mb-8">
                Sorry, the page you are looking for does not exist.
            </p>
            <Link
                to="/"
                className="bg-primary text-white font-bold py-3 px-8 rounded-full hover:bg-primary-focus transition-colors"
            >
                Go to Homepage
            </Link>
        </div>
    );
};

export default NotFoundPage;
