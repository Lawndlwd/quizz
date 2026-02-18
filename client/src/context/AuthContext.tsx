import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthCtx {
  isAdmin: boolean;
  checking: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  token: string | null;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem('adminToken');
      if (!t) { setChecking(false); return; }
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) { setIsAdmin(true); setToken(t); }
      else { localStorage.removeItem('adminToken'); setToken(null); }
      setChecking(false);
    })();
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      // Extract token from cookie echo — server sets httpOnly cookie AND we
      // also store it in localStorage for socket auth
      // Re-fetch /me to get a bearer token flow
      // Actually: let's ask the server for a token response
      // We update the server to also return the token in the body
      const t = data.token as string;
      localStorage.setItem('adminToken', t);
      setToken(t);
      setIsAdmin(true);
      return null;
    }
    return data.error ?? 'Login failed';
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsAdmin(false);
  }

  return <Ctx.Provider value={{ isAdmin, checking, login, logout, token }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
