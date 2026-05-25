import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { api, setToken, clearToken, getToken } from '@/src/api/client';
import { storage } from '@/src/utils/storage';

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
        // 1. Carregar instantaneamente do cache local para desbloquear a UI em milissegundos
        const [cachedUser, cachedMin] = await Promise.all([
          storage.getItem('cached_user', null) as Promise<User | null>,
          storage.getItem('cached_ministry', null) as Promise<Ministry | null>,
        ]);
        if (cachedUser && cachedMin) {
          setUser(cachedUser);
          setMinistry(cachedMin);
          setLoading(false);
        }

        // 2. Revalidar em segundo plano
        Promise.all([
          api<User>('/auth/me'),
          api<Ministry>('/ministry'),
        ]).then(async ([me, m]) => {
          setUser(me);
          setMinistry(m);
          await Promise.all([
            storage.setItem('cached_user', me as any),
            storage.setItem('cached_ministry', m as any),
          ]);
        }).catch(async (err) => {
          console.log('Erro ao revalidar sessão:', err);
          // Se for erro de autenticação, desconecta
          if (err.message?.includes('401') || err.message?.includes('não autenticado') || err.message?.includes('token')) {
            await clearToken();
            await Promise.all([
              storage.removeItem('cached_user'),
              storage.removeItem('cached_ministry'),
            ]);
            setUser(null);
            setMinistry(null);
          }
        }).finally(() => {
          setLoading(false);
        });

        tryRegisterPush();
      } else {
        setLoading(false);
      }
    } catch {
      await clearToken();
      await Promise.all([
        storage.removeItem('cached_user'),
        storage.removeItem('cached_ministry'),
      ]);
      setUser(null);
      setMinistry(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const r = await api<AuthResp>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    await setToken(r.token);
    setUser(r.user);
    setMinistry(r.ministry);
    await Promise.all([
      storage.setItem('cached_user', r.user as any),
      storage.setItem('cached_ministry', r.ministry as any),
    ]);
    tryRegisterPush();
  };

  const signup = async (params: { name: string; email: string; password: string; ministry_name?: string; invite_code?: string }) => {
    const r = await api<AuthResp>('/auth/signup', { method: 'POST', body: params, auth: false });
    await setToken(r.token);
    setUser(r.user);
    setMinistry(r.ministry);
    await Promise.all([
      storage.setItem('cached_user', r.user as any),
      storage.setItem('cached_ministry', r.ministry as any),
    ]);
    tryRegisterPush();
  };

  const logout = async () => {
    if (Platform.OS === 'web') {
      try {
        const { unregisterPushSubscription } = await import('@/src/services/pushNotifications');
        // Correção: corre em segundo plano para não bloquear a saída da conta se o SW travar/demorar
        unregisterPushSubscription().catch(() => {});
      } catch {}
    }
    await clearToken();
    await Promise.all([
      storage.removeItem('cached_user'),
      storage.removeItem('cached_ministry'),
      storage.removeItem('cached_stats'),
      storage.removeItem('cached_announcements'),
      storage.removeItem('cached_songs'),
      storage.removeItem('cached_scales'),
    ]);
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
