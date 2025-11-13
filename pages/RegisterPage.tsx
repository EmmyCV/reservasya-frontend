import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase'; 

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nombreValid = nombre.trim().length > 0;
  const emailValid = emailRegex.test((email ?? '').toString().trim().toLowerCase());
  const passwordValid = (password ?? '').toString().length >= 6;
  const telefonoValid = telefono === '' || /^\d+$/.test(telefono);
  const isFormValid = nombreValid && emailValid && passwordValid && telefonoValid;

  
  const navigate = useNavigate();

  

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[RegisterPage] handleRegister start');
    setLoading(true);
    setError(null);
    setSuccess(null);

    
    const finalNombre = nombre.trim();
    const finalTelefono = telefono ? telefono.trim() : '';

    if (!finalNombre || !email || !password) {
      setError('El nombre, correo y contraseña son obligatorios.');
      setLoading(false);
      return;
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Ingresa un correo electrónico válido.');
      setLoading(false);
      return;
    }

  
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    
    if (finalTelefono && /\D/.test(finalTelefono)) {
      setError('El teléfono solo puede contener números.');
      setLoading(false);
      return;
    }

    try {
      
      console.log('[RegisterPage] calling supabase.auth.signUp', { email, nombre: finalNombre, telefono: finalTelefono });

      const signUpPromise = supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            nombre: finalNombre,
            telefono: finalTelefono,
          },
        },
      });

      
      const immediateMessage = 'Registro exitoso. Revisa tu correo para confirmar (puedes iniciar sesión).';
      setSuccess(immediateMessage);
      
      setLoading(false);
      try {
        navigate('/login', { replace: true, state: { registered: true, message: immediateMessage } });
      } catch (navErr) {
        console.error('[RegisterPage] immediate navigation failed', navErr);
      }

      
      signUpPromise
        .then((res: any) => console.log('[RegisterPage] signUp result (background)', res))
        .catch((err: any) => console.error('[RegisterPage] signUp error (background)', err));

      
      return;

    } catch (error: any) {
      
      let errorMessage = 'Fallo el registro. Inténtalo de nuevo.';

      if (error && error.message) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      console.error('[RegisterPage] Fallo de registro/trigger:', errorMessage);
    }
    finally {
      
      console.log('[RegisterPage] finalizing, setting loading=false');
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Renderizado del componente 
  // ----------------------------------------------------------------------

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center" style={{ color: '#9F6A6A' }}>Crear una cuenta</h2>
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
              inputMode="numeric"
              value={telefono}
              onChange={(e) => {
                // allow only digits in the UI
                const cleaned = (e.target.value || '').toString().replace(/\D/g, '');
                setTelefono(cleaned);
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
              style={{ borderColor: '#9F6A6A' }}
              placeholder="Tu teléfono (Opcional)"
            />
            {!telefonoValid && <p className="text-xs text-red-500 mt-1">El teléfono solo puede contener números.</p>}
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
            {password && !passwordValid && (
              <p className="text-xs text-red-500 mt-1">La contraseña debe tener al menos 6 caracteres.</p>
            )}
          </div>
          <div>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              aria-disabled={!isFormValid || loading}
              style={{ backgroundColor: '#9F6A6A' }}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
            {!isFormValid && (
              <p className="text-xs text-gray-500 mt-2">El formulario no es válido. Revisa nombre, correo y contraseña (mín 6 caracteres).</p>
            )}
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