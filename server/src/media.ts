// Media search proxy — searches external providers for images and GIFs so quiz
// authors can pick media without uploading files. Video/audio stay paste-a-link
// (YouTube embed) as before — no search provider.
// API keys stay server-side (read from env); the client never sees them.
//
// Env keys (all optional — a provider is simply hidden when its key is absent):
//   UNSPLASH_ACCESS_KEY  — Unsplash stock photos
//   GIPHY_API_KEY        — Giphy GIFs
// Openverse needs no key and is always available.

export type MediaKind = 'image' | 'gif' | 'video';

export interface MediaItem {
  id: string;
  provider: string;
  kind: MediaKind;
  /** Small preview URL shown in the picker grid. */
  thumb: string;
  /**
   * The value stored on the question. For image/gif this is the direct image
   * URL (goes into `imageUrl`); for video it is the YouTube watch URL (goes
   * into `mediaUrl`).
   */
  url: string;
  title?: string;
  /** Human-readable attribution / author, when the provider supplies one. */
  credit?: string;
}

export interface MediaSearchResult {
  items: MediaItem[];
  /** Opaque cursor to pass back as `page` for the next page, or null if done. */
  nextPage: string | null;
}

export interface ProviderDef {
  id: string;
  label: string;
  kind: MediaKind;
  /** Which UI tab this provider belongs under. */
  tab: 'image' | 'gif' | 'video';
  search: (query: string, cursor: string | undefined) => Promise<MediaSearchResult>;
}

const env = (k: string) => {
  const v = process.env[k];
  return v?.trim() ? v.trim() : undefined;
};

class ProviderError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`provider ${status}: ${body}`);
    this.status = status;
  }
}

/** True for the responses Unsplash returns once its hourly quota is spent. */
function isRateLimited(err: unknown): boolean {
  return err instanceof ProviderError && (err.status === 429 || err.status === 403);
}

async function getJson(url: string, headers?: Record<string, string>): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ProviderError(res.status, body.slice(0, 200));
  }
  return res.json();
}

const PAGE_SIZE = 24;

// ── Openverse (no key) ─────────────────────────────────────────────────────────
const openverse: ProviderDef = {
  id: 'openverse',
  label: 'Openverse',
  kind: 'image',
  tab: 'image',
  async search(query, cursor) {
    const page = cursor ? Number(cursor) : 1;
    // Anonymous Openverse requests are capped at page_size 20.
    const size = 20;
    // Openverse has no trending feed — with no query, show a broad default set.
    const q = query || 'popular';
    const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page=${page}&page_size=${size}&mature=false`;
    const data = await getJson(u);
    const items: MediaItem[] = (data.results ?? []).map((r: any) => ({
      id: String(r.id),
      provider: 'openverse',
      kind: 'image' as const,
      thumb: r.thumbnail ?? r.url,
      url: r.url,
      title: r.title,
      credit: r.creator,
    }));
    const hasMore = page * size < (data.result_count ?? 0);
    return { items, nextPage: hasMore ? String(page + 1) : null };
  },
};

// ── Unsplash ───────────────────────────────────────────────────────────────────
function unsplash(key: string): ProviderDef {
  return {
    id: 'unsplash',
    label: 'Unsplash',
    kind: 'image',
    tab: 'image',
    async search(query, cursor) {
      const page = cursor ? Number(cursor) : 1;
      const map = (r: any): MediaItem => ({
        id: String(r.id),
        provider: 'unsplash',
        kind: 'image' as const,
        thumb: r.urls?.thumb ?? r.urls?.small,
        url: r.urls?.regular ?? r.urls?.full,
        title: r.alt_description,
        credit: r.user?.name,
      });
      // No query → Unsplash's popular editorial feed (returns a bare array).
      if (!query) {
        const u = `https://api.unsplash.com/photos?page=${page}&per_page=${PAGE_SIZE}&order_by=popular`;
        const data = await getJson(u, { Authorization: `Client-ID ${key}` });
        const items: MediaItem[] = (Array.isArray(data) ? data : []).map(map);
        return { items, nextPage: items.length ? String(page + 1) : null };
      }
      const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${PAGE_SIZE}`;
      const data = await getJson(u, { Authorization: `Client-ID ${key}` });
      const items: MediaItem[] = (data.results ?? []).map(map);
      const hasMore = page < (data.total_pages ?? 0);
      return { items, nextPage: hasMore ? String(page + 1) : null };
    },
  };
}

// ── Giphy ──────────────────────────────────────────────────────────────────────
function giphy(key: string): ProviderDef {
  return {
    id: 'giphy',
    label: 'Giphy',
    kind: 'gif',
    tab: 'gif',
    async search(query, cursor) {
      const offset = cursor ? Number(cursor) : 0;
      // No query → Giphy trending feed; otherwise search.
      const u = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=${PAGE_SIZE}&offset=${offset}&rating=pg-13`;
      const data = await getJson(u);
      const items: MediaItem[] = (data.data ?? []).map((g: any) => ({
        id: String(g.id),
        provider: 'giphy',
        kind: 'gif' as const,
        thumb: g.images?.fixed_width_small?.url ?? g.images?.downsized?.url,
        url: g.images?.downsized?.url ?? g.images?.original?.url,
        title: g.title,
      }));
      const total = data.pagination?.total_count ?? 0;
      const next = offset + PAGE_SIZE;
      return { items, nextPage: next < total ? String(next) : null };
    },
  };
}

// ── Combined image provider ─────────────────────────────────────────────────────
// Serves Unsplash (higher quality) and transparently falls back to Openverse
// once Unsplash's hourly rate limit is hit. The page cursor is prefixed with the
// active source (`u:` Unsplash / `o:` Openverse) so "load more" stays consistent
// after a fallback.
function combinedImages(unsplashKey: string): ProviderDef {
  const uns = unsplash(unsplashKey);
  return {
    id: 'images',
    label: 'Images',
    kind: 'image',
    tab: 'image',
    async search(query, cursor) {
      let source = 'u';
      let inner: string | undefined;
      if (cursor) {
        const idx = cursor.indexOf(':');
        source = cursor.slice(0, idx);
        inner = cursor.slice(idx + 1) || undefined;
      }

      if (source === 'u') {
        try {
          const r = await uns.search(query, inner);
          return { items: r.items, nextPage: r.nextPage ? `u:${r.nextPage}` : null };
        } catch (err) {
          // Rate-limited, invalid key, network error — whatever the reason,
          // fall back to Openverse so images always work. Restart at page 1.
          const why = isRateLimited(err) ? 'rate-limited' : 'unavailable';
          console.warn(`Unsplash ${why}, falling back to Openverse:`, (err as Error).message);
        }
        inner = undefined;
      }

      const r = await openverse.search(query, inner);
      return { items: r.items, nextPage: r.nextPage ? `o:${r.nextPage}` : null };
    },
  };
}

/** Build the list of enabled providers from whatever keys are configured. */
function buildProviders(): ProviderDef[] {
  const unsplashKey = env('UNSPLASH_ACCESS_KEY');
  // One image provider: Unsplash-with-Openverse-fallback when a key is set,
  // otherwise plain Openverse.
  const list: ProviderDef[] = [unsplashKey ? combinedImages(unsplashKey) : openverse];
  const giphyKey = env('GIPHY_API_KEY');
  if (giphyKey) list.push(giphy(giphyKey));
  return list;
}

// Env keys can't change at runtime, so build the provider list once.
const PROVIDERS = buildProviders();
const PROVIDERS_BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function enabledProviders(): ProviderDef[] {
  return PROVIDERS;
}

export function findProvider(id: string): ProviderDef | undefined {
  return PROVIDERS_BY_ID.get(id);
}
