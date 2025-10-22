import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientDashboard from './pages/ClientDashboard';
import MyReservationsPage from './pages/MyReservationsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminPreview from './pages/AdminPreview';
import NotFoundPage from './pages/NotFoundPage';
import AdminLoginPage from './pages/AdminLoginPage';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-secondary text-text-primary">
        <Navbar />
        <main className="container mx-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Client Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['Cliente']}>
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-reservations" 
              element={
                <ProtectedRoute allowedRoles={['Cliente']}>
                  <MyReservationsPage />
                </ProtectedRoute>
              } 
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            {/* Public preview route for admin panel (no auth). Render AdminDashboard directly for preview. */}
            <Route path="/admin/preview" element={<AdminDashboard />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={["Administrador"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
