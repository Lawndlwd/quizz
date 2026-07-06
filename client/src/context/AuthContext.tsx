import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthRole, AuthUser } from '../types';

export type LoginResult = { ok: false; error: string } | { ok: true; role: AuthRole };

interface AuthCtx {
  role: AuthRole | null;
  user: AuthUser | null;
  checking: boolean;
  token: string | null;
  /** Any authenticated role (super admin or user). */
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Unified login — super-admin username or user email, same endpoint. */
  login: (identifier: string, password: string) => Promise<LoginResult>;
  registerUser: (email: string, password: string, username: string) => Promise<string | null>;
  updatePlayProfile: (displayName: string, avatar: string) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const TOKEN_KEY = 'adminToken';

type MeResult =
  | {
      ok: true;
      role: AuthRole;
      id: number;
      username: string;
      email: string | null;
      playDisplayName: string | null;
      playAvatar: string | null;
    }
  | { ok: false; error: string };

async function fetchMe(token: string): Promise<MeResult> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    role?: AuthRole;
    id?: number;
    username?: string;
    email?: string | null;
    playDisplayName?: string | null;
    playAvatar?: string | null;
  };
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Unauthorized' };
  }
  return {
    ok: true,
    role: data.role as AuthRole,
    id: data.id as number,
    username: data.username as string,
    email: (data.email as string | null) ?? null,
    playDisplayName: data.playDisplayName ?? null,
    playAvatar: data.playAvatar ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AuthRole | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        setChecking(false);
        return;
      }
      const me = await fetchMe(t);
      if (me.ok) {
        setRole(me.role);
        setUser({
          id: me.id,
          email: me.email,
          username: me.username,
          playDisplayName: me.playDisplayName,
          playAvatar: me.playAvatar,
        });
        setToken(t);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      setChecking(false);
    })();
  }, []);

  const applyToken = useCallback(async (t: string): Promise<LoginResult> => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    const me = await fetchMe(t);
    if (!me.ok) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return { ok: false, error: me.error };
    }
    setRole(me.role);
    setUser({
      id: me.id,
      email: me.email,
      username: me.username,
      playDisplayName: me.playDisplayName,
      playAvatar: me.playAvatar,
    });
    return { ok: true, role: me.role };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: (data.error as string) ?? 'Login failed' };
      return applyToken(data.token as string);
    },
    [applyToken],
  );

  const registerUser = useCallback(
    async (email: string, password: string, username: string): Promise<string | null> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (!res.ok) return (data.error as string) ?? 'Registration failed';
      const result = await applyToken(data.token as string);
      return result.ok ? null : result.error;
    },
    [applyToken],
  );

  const updatePlayProfile = useCallback((displayName: string, avatar: string) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            playDisplayName: displayName,
            playAvatar: avatar || null,
          }
        : prev,
    );
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRole(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      role,
      user,
      checking,
      token,
      isAdmin: role !== null,
      isSuperAdmin: role === 'super_admin',
      login,
      registerUser,
      updatePlayProfile,
      logout,
    }),
    [role, user, checking, token, login, registerUser, updatePlayProfile, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
