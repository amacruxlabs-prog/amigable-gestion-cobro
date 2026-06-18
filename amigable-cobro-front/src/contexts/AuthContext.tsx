import React, { createContext, useContext, useEffect, useState } from 'react';
import { localAuth, localDb, User } from '../lib/localDb';

export type Role = 'SUPERADMIN' | 'TENANT_ADMIN' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  businessId: string | null;
  loading: boolean;
  signIn: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSuperadmin: boolean;
  isTenantAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  businessId: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isSuperadmin: false,
  isTenantAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeRole: (() => void) | null = null;

    const unsubscribeAuth = localAuth.onAuthStateChanged((localUser) => {
      if (unsubscribeRole) {
        unsubscribeRole();
        unsubscribeRole = null;
      }

      setUser(localUser);
      if (!localUser || !localUser.email) {
        setRole(null);
        setBusinessId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const uid = localUser.uid;
      
      unsubscribeRole = localDb.subscribeDoc('users', uid, (userData) => {
        if (userData) {
          setRole(userData.role as Role);
          setBusinessId(userData.businessId || null);
        } else {
          // Initial superadmin fallback
          if (localUser.email === 'amacruxlabs@gmail.com') {
            setRole('SUPERADMIN');
            setBusinessId(null);
          } else {
            setRole('TENANT_ADMIN');
            setBusinessId('demo-business-1'); // Default fallback for mock tenant
          }
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRole) unsubscribeRole();
    };
  }, []);

  const isSuperadmin = role === 'SUPERADMIN' || user?.email === 'amacruxlabs@gmail.com';
  const isTenantAdmin = role === 'TENANT_ADMIN';

  const handleSignIn = async (email?: string) => {
    localAuth.signIn(email || 'amacruxlabs@gmail.com');
  };

  const handleSignOut = async () => {
    localAuth.signOut();
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
      isTenantAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
