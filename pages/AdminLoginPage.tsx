import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const emailClean = (email ?? '').toString().trim().toLowerCase();
      const passwordRaw = (password ?? '').toString();

     
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: passwordRaw
      });

      console.log('Auth response data:', data);
      console.log('Auth response error:', error);

      if (error) {
        setError('Contraseña inválida o cuenta no verificada.');
        return;
      }
      if (!data || !data.user) {
        setError('Usuario o contraseña inválidos.');
        return;
      }
      const { user } = data;
      const { data: perfil, error: perfilError } = await supabase
        .from('usuario')
        .select('rol')
        .eq('auth_id', user.id)
        .single();
      if (perfilError) throw perfilError;
      if (!perfil) throw new Error('No se encontró perfil para este usuario.');
      if (perfil.rol === 'Administrador' || perfil.rol === 'Admin') {
        // Guarda el access token como en tu ejemplo
        if (data?.session?.access_token) {
          localStorage.setItem('admin_token', data.session.access_token);
        }
        navigate('/admin');
      } else {
        // Limpia token por seguridad
        localStorage.removeItem('admin_token');
        setError('No tienes permisos de administrador.');
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Iniciar sesión como administrador</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm"
              style={{ borderColor: '#9F6A6A' }}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
            <input
              id="password"
                type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm"
              style={{ borderColor: '#9F6A6A' }}
              placeholder="••••••••"
            />
              <div className="flex items-center mt-2">
                <input
                  id="showPassword"
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="mr-2"
                />
                <label htmlFor="showPassword" className="text-sm text-gray-700">Mostrar contraseña</label>
              </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#9F6A6A' }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
