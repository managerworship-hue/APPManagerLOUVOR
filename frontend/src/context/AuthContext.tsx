import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { api, setToken, clearToken, getToken } from '@/src/api/client';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'leader' | 'member';
  permissions: string[];
  instruments: string[];
  ministry_id: string;
  avatar?: string;
};

export type Ministry = {
  id: string;
  name: string;
  invite_code: string;
  api_key?: string | null;
};

type AuthResp = { token: string; user: User; ministry: Ministry };

type Ctx = {
  user: User | null;
  ministry: Ministry | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: { name: string; email: string; password: string; ministry_name?: string; invite_code?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
  isLeader: boolean;
  hasPermission: (p: string) => boolean;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

async function tryRegisterPush() {
  if (Platform.OS !== 'web') return;
  try {
    const { registerPushSubscription } = await import('@/src/services/pushNotifications');
    await registerPushSubscription();
  } catch (e) {
    console.log('Push não disponível:', e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const tok = await getToken();
      if (tok) {
        const [me, m] = await Promise.all([
          api<User>('/auth/me'),
          api<Ministry>('/ministry'),
        ]);
        setUser(me);
        setMinistry(m);
        // Registar push ao retomar sessão
        tryRegisterPush();
      }
    } catch {
      await clearToken();
      setUser(null);
      setMinistry(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const r = await api<AuthResp>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    await setToken(r.token);
    setUser(r.user);
    setMinistry(r.ministry);
    tryRegisterPush();
  };

  const signup = async (params: { name: string; email: string; password: string; ministry_name?: string; invite_code?: string }) => {
    const r = await api<AuthResp>('/auth/signup', { method: 'POST', body: params, auth: false });
    await setToken(r.token);
    setUser(r.user);
    setMinistry(r.ministry);
    tryRegisterPush();
  };

  const logout = async () => {
    if (Platform.OS === 'web') {
      try {
        const { unregisterPushSubscription } = await import('@/src/services/pushNotifications');
        await unregisterPushSubscription();
      } catch {}
    }
    await clearToken();
    setUser(null);
    setMinistry(null);
  };

  const refresh = async () => {
    const [me, m] = await Promise.all([
      api<User>('/auth/me'),
      api<Ministry>('/ministry'),
    ]);
    setUser(me);
    setMinistry(m);
  };

  const isLeader = user?.role === 'leader';
  const hasPermission = (p: string) => !!user && (user.role === 'leader' || user.permissions.includes(p));

  return (
    <AuthContext.Provider value={{ user, ministry, loading, login, signup, logout, refresh, setUser, isLeader, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
