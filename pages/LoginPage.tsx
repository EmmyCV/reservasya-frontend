import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Importamos la instancia configurada

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ----------------------------------------------------------------------
      // PASO 1: Autenticar al usuario (verificar email y password)
      // ----------------------------------------------------------------------
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error('Error de autenticación:', authError);
        // Mensaje de error común de Supabase: "Invalid login credentials"
        throw new Error('Credenciales inválidas. Verifica tu email y contraseña.');
      }

      if (!authData.user) {
        throw new Error('No se encontró el usuario después del login.');
      }

      // ----------------------------------------------------------------------
      // PASO 2: Obtener el Rol del perfil del usuario (de la tabla 'usuario')
      // ----------------------------------------------------------------------
      // Usamos el ID del usuario autenticado para buscar su perfil
      const { data: profileData, error: profileError } = await supabase
        .from('usuario')
        .select('rol') // Solo necesitamos saber el rol
        .eq('id', authData.user.id) // Buscamos el perfil por el ID de autenticación
        .single(); // Esperamos solo un resultado

      if (profileError) {
        console.error('Error obteniendo el perfil:', profileError);
        // Si falla aquí, el usuario está logueado pero no podemos redirigirlo.
        // Es mejor cerrar la sesión para evitar inconsistencias.
        await supabase.auth.signOut();
        throw new Error('No se pudo encontrar el perfil del usuario.');
      }

      if (!profileData || !profileData.rol) {
        await supabase.auth.signOut();
        throw new Error('El perfil del usuario no tiene un rol asignado.');
      }

      // ----------------------------------------------------------------------
      // PASO 3: Redirección Inteligente basada en el Rol
      // ----------------------------------------------------------------------
      const userRole = profileData.rol; // Ej: 'Cliente', 'Empleado', 'Administrador'
      
      console.log(`Inicio de sesión exitoso. Usuario: ${authData.user.email}, Rol: ${userRole}`);

      // Reemplaza estas rutas con las rutas reales de tus dashboards
      switch (userRole) {
        case 'Administrador':
          navigate('/admin');
          break;
        case 'Empleado':
          navigate('/empleado');
          break;
        case 'Cliente':
          navigate('/dashboard');
          break;
        default:
          // Si el rol no es reconocido, lo enviamos a una página de "caída"
          console.warn(`Rol no reconocido: ${userRole}`);
          navigate('/'); // O una página de error
      }

    } catch (error: any) {
      // Manejo de errores (ej: credenciales inválidas, perfil no encontrado)
      setError(error.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Iniciar Sesión</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

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
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" style={{ color: '#9F6A6A' }} className="font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;