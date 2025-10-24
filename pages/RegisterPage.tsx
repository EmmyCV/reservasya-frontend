import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Ahora esta ruta es válida

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validaciones básicas del frontend
    if (!email || !password || !nombre) {
        setError('El email, la contraseña y el nombre son obligatorios.');
        setLoading(false);
        return;
    }

    const finalNombre = nombre.trim();
    // Prepara el teléfono: si no hay valor, envía null. El trigger lo manejará.
    const finalTelefono = telefono ? telefono.trim() : null; 

    if (!finalNombre) {
      setError('El nombre no puede estar vacío.');
      setLoading(false);
      return;
    }

    try {
      // *** Flujo CRÍTICO: Una sola llamada para Autenticación y Perfil ***
      // 1. supabase.auth.signUp crea la cuenta en auth.users.
      // 2. El objeto 'options.data' es leído por el trigger handle_new_user().
      // 3. El trigger inserta el perfil en la tabla 'usuario' automáticamente.
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: finalNombre,   // <-- Enviamos el nombre real
            telefono: finalTelefono // <-- Enviamos el teléfono real o null
          }
        }
      });

      if (error) {
        // Maneja errores de autenticación (ej: email ya existe, contraseña débil)
        console.error('Error de Autenticación:', error);
        throw error;
      }
      
      // La variable data.user será null si la verificación por correo electrónico está activa.
      const successMessage = data.user 
        ? '¡Registro exitoso! Ya puedes iniciar sesión.'
        : '¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.';

      setSuccess(successMessage);
      setTimeout(() => navigate('/login'), 5000);

    } catch (error: any) {
      // Manejo de errores unificado, incluyendo errores del trigger si son devueltos
      let errorMessage = 'Fallo el registro. Inténtalo de nuevo.';

      if (error && error.message) {
        errorMessage = error.message;
        // Si el trigger falla (ej. si la validación del teléfono falla en la DB),
        // este error suele aparecer aquí.
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      console.error("Fallo de registro/trigger:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Renderizado del componente (sin cambios)
  // ----------------------------------------------------------------------

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Crear una cuenta</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <div>
            <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Nombre completo</label>
            <input 
              id="nombre" 
              type="text" 
              required 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" 
              style={{ borderColor: '#9F6A6A' }} 
              placeholder="Tu nombre" 
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <input 
              id="email" 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" 
              style={{ borderColor: '#9F6A6A' }} 
              placeholder="tucorreo@ejemplo.com" 
            />
          </div>
          <div>
            <label htmlFor="telefono" className="text-sm font-medium text-gray-700">Teléfono</label>
            <input 
              id="telefono" 
              type="tel" 
              value={telefono} 
              onChange={(e) => setTelefono(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" 
              style={{ borderColor: '#9F6A6A' }} 
              placeholder="Tu teléfono (Opcional)" 
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
            <input 
              id="password" 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" 
              style={{ borderColor: '#9F6A6A' }} 
              placeholder="••••••••" 
            />
          </div>
          <div>
            <button 
              type="submit" 
              disabled={loading} 
              style={{ backgroundColor: '#9F6A6A' }} 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" style={{ color: '#9F6A6A' }} className="font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;