import { useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '../context/AuthContext';

export function useAuthFetch() {
  const { token } = useAuth();

  return useMemo(
    () => ({
      token,
      get: <T>(path: string) => apiFetch<T>(path, { token }),
      post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', token, body }),
      put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', token, body }),
      delete: <T>(path: string, body?: unknown) =>
        apiFetch<T>(path, { method: 'DELETE', token, body }),
    }),
    [token],
  );
}
