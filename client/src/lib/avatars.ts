let cachedUrls: string[] | null = null;
let inflight: Promise<string[]> | null = null;

export function fetchAvatarUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!inflight) {
    inflight = fetch('/api/avatars')
      .then((r) => (r.ok ? r.json() : []))
      .then((urls: string[]) => {
        cachedUrls = Array.isArray(urls) ? urls : [];
        return cachedUrls;
      })
      .catch(() => {
        cachedUrls = [];
        return cachedUrls;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateAvatarCache(): void {
  cachedUrls = null;
}
