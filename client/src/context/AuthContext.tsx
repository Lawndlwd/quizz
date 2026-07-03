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

interface AuthCtx {
  role: AuthRole | null;
  user: AuthUser | null;
  checking: boolean;
  token: string | null;
  /** Any authenticated role (super admin or user). */
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loginSuperAdmin: (username: string, password: string) => Promise<string | null>;
  loginUser: (email: string, password: string) => Promise<string | null>;
  registerUser: (email: string, password: string, username: string) => Promise<string | null>;
  /** @deprecated Use loginSuperAdmin */
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const TOKEN_KEY = 'adminToken';

async function fetchMe(token: string): Promise<{
  role: AuthRole;
  id: number;
  username: string;
  email: string | null;
} | null> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    role: data.role as AuthRole,
    id: data.id as number,
    username: data.username as string,
    email: (data.email as string | null) ?? null,
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
      if (me) {
        setRole(me.role);
        setUser({ id: me.id, email: me.email, username: me.username });
        setToken(t);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      setChecking(false);
    })();
  }, []);

  const applyToken = useCallback(async (t: string): Promise<string | null> => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    const me = await fetchMe(t);
    if (!me) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return 'Session validation failed';
    }
    setRole(me.role);
    setUser({ id: me.id, email: me.email, username: me.username });
    return null;
  }, []);

  const loginSuperAdmin = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return (data.error as string) ?? 'Login failed';
      return applyToken(data.token as string);
    },
    [applyToken],
  );

  const loginUser = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return (data.error as string) ?? 'Login failed';
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
      return applyToken(data.token as string);
    },
    [applyToken],
  );

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
      loginSuperAdmin,
      loginUser,
      registerUser,
      login: loginSuperAdmin,
      logout,
    }),
    [role, user, checking, token, loginSuperAdmin, loginUser, registerUser, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
