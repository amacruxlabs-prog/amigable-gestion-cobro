import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/axios';

export type Role = 'Administrador' | 'Admin Negocio' | 'Admin Local' | 'Lectura' | null;

export interface User {
  id: number;
  name: string;
  email: string;
  business_id?: number | null;
  business?: { id: number; name: string } | null;
  roles?: { name: string }[];
}

interface AuthContextType {
  user: User | null;
  role: Role;
  businessId: number | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => void;
  isSuperadmin: boolean;
  isTenantAdmin: boolean;
  isAdmin: boolean;
  isVisor: boolean;
  updateToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  businessId: null,
  loading: true,
  signIn: async () => {},
  signOut: () => {},
  isSuperadmin: false,
  isTenantAdmin: false,
  isAdmin: false,
  isVisor: false,
  updateToken: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data;
      setUser(userData);
      
      // Mapear rol (suponiendo que Spatie devuelve un array en 'roles')
      const userRoleName = userData.roles && userData.roles.length > 0 ? userData.roles[0].name : null;
      setRole(userRoleName as Role);
      setBusinessId(userData.business_id || null);
    } catch (error) {
      setUser(null);
      setRole(null);
      setBusinessId(null);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setRole(null);
      setBusinessId(null);
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const proactivelyRefreshToken = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      try {
        const response = await api.post('/auth/refresh');
        const newToken = response.data?.data?.access_token;
        if (newToken) {
          localStorage.setItem('auth_token', newToken);
          console.log('[AuthContext] Token refreshed proactively.');
        }
      } catch (error) {
        console.error('[AuthContext] Failed to proactively refresh token:', error);
      }
    };

    // Refrescar cada 10 minutos (600,000 ms)
    const interval = setInterval(proactivelyRefreshToken, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const isSuperadmin = role === 'Administrador';
  const isTenantAdmin = role === 'Admin Negocio' || role === 'Admin Local';
  const isAdmin = isSuperadmin || isTenantAdmin;
  const isVisor = role === 'Lectura';

  const handleSignIn = async (email: string, password?: string) => {
    // Quitamos setLoading(true) para no desmontar el LoginScreen y evitar el parpadeo
    try {
      // Si el backend es de prueba y no requiere clave o estamos emulando
      const payload = password ? { email, password } : { email, password: 'password' };
      const response = await api.post('/auth/login', payload);
      
      if (response.data?.data?.access_token) {
        localStorage.setItem('auth_token', response.data.data.access_token);
        // fetchUser() sí usará setLoading internamente, lo cual está bien si el login fue exitoso
        await fetchUser();
      }
    } catch (error) {
      throw error; // Propagamos para que el Formik capture
    }
  };

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setRole(null);
      setBusinessId(null);
    }
  };

  const updateToken = async (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      businessId,
      loading,
      signIn: handleSignIn,
      signOut: handleSignOut,
      isSuperadmin,
      isTenantAdmin,
      isAdmin,
      isVisor,
      updateToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};
