import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import {
  createUserProfile,
  getUserCompanyMembershipsWithDetails
} from '@/schemas/firestore-utils';
import { UserCompanyMembership } from '@/schemas/types';
type EmpresaMembership = UserCompanyMembership & { companyName?: string };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  empresaId: string | null;
  setEmpresaId: (empresaId: string | null) => void;
  empresas: EmpresaMembership[];
  refreshEmpresas: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutApp: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaMembership[]>([]);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setEmpresaId(null);
        setEmpresas([]);
        return;
      }
      await refreshEmpresasInternal(u.uid);
    });
    return () => unsub();
  }, []);
  const refreshEmpresasInternal = async (uid: string) => {
    try {
      const memberships = await getUserCompanyMembershipsWithDetails(uid);
      setEmpresas(memberships);
      if (memberships.length === 1) {
        setEmpresaId(memberships[0].empresaId);
      }
    } catch (e) {
      console.error('Error refreshing empresas:', e);
    }
  };
  const refreshEmpresas = async () => {
    if (!user) return;
    await refreshEmpresasInternal(user.uid);
  };
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  const signUpWithEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(cred.user.uid, cred.user.email || email);
  };
  const signOutApp = async () => {
    await signOut(auth);
    setEmpresaId(null);
    setEmpresas([]);
  };
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    empresaId,
    setEmpresaId,
    empresas,
    refreshEmpresas,
    signInWithEmail,
    signUpWithEmail,
    signOutApp,
  }), [user, loading, empresaId, empresas]);
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
