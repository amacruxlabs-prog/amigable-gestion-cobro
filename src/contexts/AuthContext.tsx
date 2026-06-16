import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType, signOut, User, onAuthStateChanged, doc, onSnapshot } from '../lib/firebase';

export type Role = 'superadmin' | 'admin' | 'visor' | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  signIn: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isVisor: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isSuperadmin: false,
  isAdmin: false,
  isVisor: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeRole: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeRole) {
        unsubscribeRole();
        unsubscribeRole = null;
      }

      setUser(firebaseUser);
      if (!firebaseUser || !firebaseUser.email) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const email = firebaseUser.email;
      const roleRef = doc(db, 'roles', email);
      
      unsubscribeRole = onSnapshot(
        roleRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setRole(snapshot.data().role as Role);
          } else {
            // Initial superadmin fallback
            if (email === 'amacruxlabs@gmail.com') {
              setRole('superadmin');
            } else {
              setRole(null);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Role snapshot error", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRole) unsubscribeRole();
    };
  }, []);

  const isSuperadmin = role === 'superadmin' || user?.email === 'amacruxlabs@gmail.com';
  const isAdmin = isSuperadmin || role === 'admin';
  const isVisor = isAdmin || role === 'visor';

  const handleSignIn = async (email?: string) => {
    await auth.signIn(email || 'amacruxlabs@gmail.com');
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      signIn: handleSignIn,
      signOut,
      isSuperadmin,
      isAdmin,
      isVisor
    }}>
      {children}
    </AuthContext.Provider>
  );
};
