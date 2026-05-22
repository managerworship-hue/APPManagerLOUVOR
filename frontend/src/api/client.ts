import { storage } from '@/src/utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
const API_BASE = `${BACKEND_URL}/api`;
const TOKEN_KEY = 'louvor_token';

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean;
};

export async function getToken(): Promise<string | null> {
  return await storage.getItem<string>(TOKEN_KEY, '');
}

export async function setToken(t: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, t);
}

export async function clearToken(): Promise<void> {
  await storage.removeItem(TOKEN_KEY);
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = data?.detail || data?.message || `Erro ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export { API_BASE };
