import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Asegúrate de que esta ruta es correcta

const MyReservationsPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Aunque lo usamos principalmente para compatibilidad, la redirección será forzada.
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
    const finalTelefono = telefono ? telefono.trim() : null;

    if (!finalNombre) {
      setError('El nombre no puede estar vacío.');
      setLoading(false);
      return;
    }

    try {
      // La llamada a la API de Supabase para registro
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: finalNombre,
            telefono: finalTelefono
          }
        }
      });

      if (error) {
        console.error('Error de Autenticación:', error);
        throw error;
      }

      // 1. Detenemos el indicador de carga.
      setLoading(false);

      // 2. CORRECCIÓN LÓGICA DE REDIRECCIÓN Y APLICACIÓN DE REDIRECCIÓN FORZADA:
      if (data.user) {
        // El usuario fue registrado y logueado automáticamente.
        setSuccess('¡Registro exitoso! Redirigiendo a Iniciar Sesión...');

        // 🔥 SOLUCIÓN FORZADA: Usamos window.location.replace para garantizar la navegación
        // incluso si React Router tiene problemas con el historial del iframe.
        setTimeout(() => {
          window.location.replace('/login');
        }, 50); // Mantenemos el retardo mínimo para mostrar el mensaje de éxito.

        return;
      }

      // 3. Si no hay data.user, significa que se envió un correo de verificación.
      setSuccess('¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.');
      // En este caso, nos quedamos en la página de registro para mostrar el mensaje.

    } catch (error: any) {
      // Manejo de errores 
      let errorMessage = 'Fallo el registro. Inténtalo de nuevo.';

      if (error && error.message) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      console.error("Fallo de registro/trigger:", errorMessage);
      setLoading(false); // Asegura que se apague en caso de error
    }
  };

  // ----------------------------------------------------------------------
  // Renderizado del componente 
  // ----------------------------------------------------------------------

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Mis Reservas</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {/* Mantenemos el mensaje de éxito para el caso de verificación de correo */}
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

export default MyReservationsPage;