export function authHeaders(token: string | null | undefined): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

interface ApiFetchOptions {
  token?: string | null;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{
  ok: boolean;
  status: number;
  data: T;
}> {
  const { token, method = 'GET', body, headers = {} } = options;
  const res = await fetch(path, {
    method,
    headers: {
      ...authHeaders(token),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // Tolerate empty bodies (204) and non-JSON error pages (proxy 502 HTML).
  let data = null as T;
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text) as T;
  } catch {
    /* non-JSON body → data stays null */
  }
  return { ok: res.ok, status: res.status, data };
}
