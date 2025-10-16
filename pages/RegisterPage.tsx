
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

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed, please try again.');

      // Insert user data into the 'Usuario' table
      const { error: profileError } = await supabase.from('Usuario').insert({
        auth_id: authData.user.id,
        nombre,
        correo: email,
        telefono,
        rol: 'Cliente', // Default role for new signups
      });

      if (profileError) {
        // Potentially handle user deletion from auth if profile creation fails
        throw profileError;
      }

      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => navigate('/login'), 5000);

    } catch (error: any) {
      setError(error.message || 'Failed to register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-text-primary">Create an Account</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          <div>
            <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Full Name</label>
            <input id="nombre" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="telefono" className="text-sm font-medium text-gray-700">Phone Number</label>
            <input id="telefono" type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
         <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
