import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

interface AuthCtx {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  checking: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  token: string | null;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));

  useEffect(() => {
    (async () => {
      const t = localStorage.getItem('adminToken');
      if (!t) {
        setChecking(false);
        return;
      }
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(true);
        setIsSuperAdmin(data.isSuperAdmin ?? false);
        setToken(t);
      } else {
        localStorage.removeItem('adminToken');
        setToken(null);
      }
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
      const t = data.token as string;
      localStorage.setItem('adminToken', t);
      setToken(t);
      setIsAdmin(true);
      // Fetch /me to get isSuperAdmin status
      const meRes = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsSuperAdmin(meData.isSuperAdmin ?? false);
      }
      return null;
    }
    return data.error ?? 'Login failed';
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  }

  return (
    <Ctx.Provider value={{ isAdmin, isSuperAdmin, checking, login, logout, token }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
