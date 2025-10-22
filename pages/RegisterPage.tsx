import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

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

    // CRÍTICO: Asegurar que el campo NOT NULL 'nombre' no sea null/undefined.
    const finalNombre = nombre.trim();
    
    if (!finalNombre) {
      setError('El nombre no puede estar vacío.');
      setLoading(false);
      return;
    }

    let authUserId: string | null = null; 

    try {
      // Paso 1: Crear Auth User (Cuenta de seguridad)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed, please try again.');

      authUserId = authData.user.id; 

      // Paso 2: Crear Perfil DB (Usando el ID de Auth como PK en la tabla 'usuario')
      const { error: profileError } = await supabase.from('usuario').insert({
        // OBLIGATORIO Y PK
        id: authUserId, 
        
        // OBLIGATORIO (NOT NULL)
        nombre: finalNombre, 
        
        // OPCIONAL (Permite NULL)
        telefono: telefono || null, 
        
        // OBLIGATORIO (NOT NULL) con DEFAULT 'Cliente' en DB. 
        // Lo enviamos para asegurar la capitalización correcta y el CHECK.
        rol: 'Cliente', 

        // OMITIDOS:
        // usuarionuevo: Omitido porque tiene DEFAULT 'true'.
        // fecharegistro: Omitido porque tiene DEFAULT CURRENT_DATE.
        // cargo: Omitido (Permite NULL, lo enviaremos como NULL o vacío si la variable no existe).
        // created_at: Omitido porque tiene DEFAULT now().
      });

      if (profileError) {
        console.error('Database Insertion Error (Paso 2):', profileError);
        throw profileError; 
      }

      setSuccess('¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.');
      setTimeout(() => navigate('/login'), 5000);

    } catch (error: any) {
      let errorMessage = 'Fallo el registro. Inténtalo de nuevo.';
      
      if (error && error.message) {
        // Muestra el mensaje de error de la base de datos (ej: "violación de RLS")
        errorMessage = error.message; 
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);

      if (authUserId) {
        console.warn("User profile creation failed. Auth user ID:", authUserId);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Crear una cuenta</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <div>
            <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Nombre completo</label>
            <input id="nombre" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" style={{ borderColor: '#9F6A6A' }} placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" style={{ borderColor: '#9F6A6A' }} placeholder="tucorreo@ejemplo.com" />
          </div>
          <div>
            <label htmlFor="telefono" className="text-sm font-medium text-gray-700">Teléfono</label>
            <input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" style={{ borderColor: '#9F6A6A' }} placeholder="Tu teléfono (Opcional)" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" style={{ borderColor: '#9F6A6A' }} placeholder="••••••••" />
          </div>
          <div>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#9F6A6A' }} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50">
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