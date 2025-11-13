import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------
// 1. Tipos de Datos
// ----------------------------------------------------------------------

type Role = 'Cliente' | 'Empleado' | 'Administrador' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------------------------------------------------------------
// 2. Hook Personalizado
// ----------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// ----------------------------------------------------------------------
// 3. Proveedor del Contexto
// ----------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true); // Siempre comienza cargando

  const navigate = useNavigate();

// Función final para obtener el rol, con manejo de errores limpio
const fetchUserRole = async (userId: string): Promise<Role> => {
    try {
        const { data, error } = await supabase
            .from('usuario') 
            .select('rol')
            .eq('id', userId)
            .single();

        if (error) {
            // Si hay un error (ej. 42501 permission denied), lo registra y asigna 'Cliente'.
            console.error('[AuthContext] Error al obtener el rol. Verifique permisos SQL (GRANT SELECT):', error.message);
            return 'Cliente'; 
        }
        
        // Si data es null, se asigna Cliente
        const fetchedRole = (data?.rol as Role) || 'Cliente';
        return fetchedRole;

    } catch (criticalError) {
        console.error('[AuthContext] Falla crítica:', criticalError);
        return 'Cliente'; 
    }
};



  // ----------------------------------------------------------------
  // EFECTO PRINCIPAL (CORREGIDO)
  // ----------------------------------------------------------------
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizar el estado si el componente se desmonta

    // Función asíncrona para manejar la lógica de la sesión
    const handleSession = async (session: { user: User | null; event: string; }) => {
      const { user: currentUser, event } = session;

      if (!isMounted) return;

      setUser(currentUser);
      let newRole: Role = null;

      if (currentUser) {
        newRole = await fetchUserRole(currentUser.id);
        setRole(newRole);
// Lógica de Redirección (solo para SIGNED_IN)
if (event === 'SIGNED_IN') {
  if (newRole === 'Administrador') {
    navigate('/admin', { replace: true });
  } else if (newRole === 'Empleado') {
    navigate('/empleado', { replace: true });
  } else {
    navigate('/dashboard', { replace: true });
  }
}
      } else {
        // Usuario deslogueado: Limpiar estado y redirigir a login
        setRole(null);
        if (event === 'SIGNED_OUT') {
           navigate('/login', { replace: true });
        }
      }
      
      // La carga finaliza después de procesar el evento,
      // independientemente de si hay usuario o no.
      setIsLoading(false); 
    };

    // 1. Obtener la sesión INICIAL para evitar la espera
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        // Procesamos la sesión inicial y APAGAMOS la carga
        handleSession({ user: session?.user ?? null, event: 'INITIAL_SESSION' });
      }
    });

    // 2. Suscripción para eventos FUTUROS (login, logout)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthContext] Evento de Auth: ${event}`);
      if (isMounted) {
        // Los eventos futuros usan el mismo manejador de sesión, pero ya no tienen
        // que preocuparse por apagar la carga inicial.
        handleSession({ user: session?.user ?? null, event: event });
      }
    });

    // Limpieza
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Función de cierre de sesión
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error);
    }
    // El onAuthStateChange manejará el resto.
  };

  const value = {
    user,
    role,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ----------------------------------------------------------------------
// 4. Componente de Carga (sin cambios)
// ----------------------------------------------------------------------

export const AuthLoader: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isLoading } = useAuth();
   
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen text-xl font-semibold" style={{ color: '#9F6A6A' }}>
                Cargando autenticación...
            </div>
        );
    }

    return <>{children}</>;
}
