import { ImageIcon, ImagePlay, type LucideIcon, Music, Video } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QuestionMedia } from '@/components/QuestionMedia';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseYouTubeId, parseYouTubeStart } from '@/helpers';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { cn } from '@/lib/utils';
import { Input } from './Input';

export type MediaPick = { kind: 'image' | 'audio' | 'video'; url: string };

interface MediaItem {
  id: string;
  provider: string;
  kind: 'image' | 'gif' | 'video';
  thumb: string;
  url: string;
  title?: string;
  credit?: string;
}

interface Provider {
  id: string;
  label: string;
  tab: 'image' | 'gif' | 'video';
  kind: string;
}

export type MediaTab = 'image' | 'gif' | 'video' | 'audio';
type Tab = MediaTab;

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'gif', label: 'GIFs', icon: ImagePlay },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
];

// Which provider tab backs each picker tab. Video/audio have no search provider
// (paste a YouTube link instead), so this only matters for image/gif.
const providerTabFor = (t: Tab): Provider['tab'] => (t === 'audio' ? 'video' : t);

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (m: MediaPick) => void;
  /**
   * Which tabs to offer. Defaults to all. e.g. ['image'] for a quiz cover,
   * ['image', 'gif'] for answer pictures (no video/audio).
   */
  allow?: Tab[];
}

export function MediaPicker({ open, onClose, onPick, allow }: Props) {
  const api = useAuthFetch();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tab, setTab] = useState<Tab>('image');
  const [provider, setProvider] = useState<string>('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const reqId = useRef(0);
  // Result cache keyed by `${provider}::${query}` so re-visiting a tab (or a
  // repeated search) restores instantly without re-fetching. Persists for the
  // component's lifetime (the modal stays mounted, so also across re-opens).
  const cache = useRef(new Map<string, { items: MediaItem[]; nextPage: string | null }>());
  // The last query shown per provider, so returning to a tab restores that view.
  const lastQuery = useRef(new Map<string, string>());

  // Load available providers once the modal opens.
  useEffect(() => {
    if (!open) return;
    api.get<{ providers: Provider[] }>('/api/media/providers').then(({ ok, data }) => {
      if (ok) setProviders(data.providers ?? []);
    });
  }, [open, api]);

  const tabProviders = providers.filter((p) => p.tab === providerTabFor(tab));

  // Keep the active provider valid for the current tab.
  useEffect(() => {
    if (tabProviders.length === 0) {
      setProvider('');
    } else if (!tabProviders.some((p) => p.id === provider)) {
      setProvider(tabProviders[0].id);
    }
  }, [tabProviders, provider]);

  // Fetch (or restore from cache) results for a provider + query.
  const load = useCallback(
    async (prov: string, q: string, append: boolean) => {
      if (!prov) return;
      const key = `${prov}::${q}`;
      if (!append) {
        lastQuery.current.set(prov, q);
        setQuery(q);
        const hit = cache.current.get(key);
        if (hit) {
          setItems(hit.items);
          setNextPage(hit.nextPage);
          setError('');
          setLoading(false);
          return;
        }
      }
      const myReq = ++reqId.current;
      setLoading(true);
      setError('');
      const base = cache.current.get(key);
      const cursor = append && base?.nextPage ? `&page=${encodeURIComponent(base.nextPage)}` : '';
      const { ok, data } = await api.get<{ items: MediaItem[]; nextPage: string | null }>(
        `/api/media/search?provider=${prov}&q=${encodeURIComponent(q)}${cursor}`,
      );
      if (myReq !== reqId.current) return; // a newer request superseded this one
      setLoading(false);
      if (!ok) {
        setError('Search failed — try again.');
        return;
      }
      const merged = append && base ? [...base.items, ...data.items] : data.items;
      cache.current.set(key, { items: merged, nextPage: data.nextPage });
      setItems(merged);
      setNextPage(data.nextPage);
    },
    [api],
  );

  // On tab / provider change, show that provider's last view — or its default
  // trending/popular feed on first visit. Video/audio have no feed.
  useEffect(() => {
    if (tab === 'video' || tab === 'audio' || !provider) return;
    load(provider, lastQuery.current.get(provider) ?? '', false);
  }, [tab, provider, load]);

  // If `allow` excludes the current tab, snap to the first allowed tab.
  useEffect(() => {
    if (allow && !allow.includes(tab)) setTab(allow[0]);
  }, [allow, tab]);

  function pickItem(it: MediaItem) {
    const kind: MediaPick['kind'] = tab === 'audio' ? 'audio' : tab === 'video' ? 'video' : 'image';
    onPick({ kind, url: it.url });
    onClose();
  }

  function submitPaste() {
    const url = pasteUrl.trim();
    if (!url) return;
    if (tab === 'video' || tab === 'audio') {
      if (!parseYouTubeId(url)) {
        setError('Paste a valid YouTube link.');
        return;
      }
      onPick({ kind: tab === 'audio' ? 'audio' : 'video', url });
    } else {
      onPick({ kind: 'image', url });
    }
    setPasteUrl('');
    onClose();
  }

  const noProviders = tabProviders.length === 0;
  const isYouTubeTab = tab === 'video' || tab === 'audio';
  // GIFs need a configured provider (Giphy); Images/Video/Audio always work.
  const hasGif = providers.some((p) => p.tab === 'gif');
  const visibleTabs = TABS.filter(
    (t) => (!allow || allow.includes(t.id)) && (t.id !== 'gif' || hasGif),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex h-[80vh] max-h-[720px] w-[calc(100%-2rem)] max-w-4xl! flex-col gap-4 sm:max-w-4xl!"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Add media</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        {visibleTabs.length > 1 && (
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Provider pills + search */}
        {tabProviders.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tabProviders.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={provider === p.id ? 'default' : 'ghost'}
                onClick={() => setProvider(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {isYouTubeTab ? (
          /* Video / Audio — paste a YouTube link (embed), exactly like before */
          <div className="studio-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-1">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {tab === 'audio' ? <Music className="size-4" /> : <Video className="size-4" />}
              {tab === 'audio'
                ? 'YouTube link — plays sound only, video hidden'
                : 'YouTube video link — embedded player'}
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitPaste();
              }}
              className="flex gap-2"
            >
              <Input
                noMargin
                className="flex-1"
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…"
                autoFocus
              />
              <Button type="submit" disabled={!pasteUrl.trim()}>
                Add {tab === 'audio' ? 'audio' : 'video'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Tip: add <code className="rounded bg-border px-1">?t=90</code> (or{' '}
              <code className="rounded bg-border px-1">&t=1m30s</code>) to the link to start partway
              in.
              {pasteUrl && parseYouTubeStart(pasteUrl) > 0 && (
                <> Starts at {parseYouTubeStart(pasteUrl)}s.</>
              )}
            </p>
            {pasteUrl && parseYouTubeId(pasteUrl) ? (
              <QuestionMedia
                url={pasteUrl}
                kind={tab === 'audio' ? 'audio' : 'video'}
                autoPlay={false}
              />
            ) : pasteUrl ? (
              <p className="text-sm text-destructive">
                That doesn't look like a YouTube link — paste a youtube.com or youtu.be URL.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {!noProviders && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  load(provider, query.trim(), false);
                }}
                className="flex gap-2"
              >
                <Input
                  noMargin
                  className="flex-1"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${tab === 'gif' ? 'GIFs' : 'images'}…`}
                  autoFocus
                />
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? '…' : 'Search'}
                </Button>
              </form>
            )}

            {/* Results grid */}
            <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading…' : `No ${tab === 'gif' ? 'GIFs' : 'images'} found.`}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {items.map((it) => (
                      <button
                        key={`${it.provider}-${it.id}`}
                        type="button"
                        onClick={() => pickItem(it)}
                        title={it.title}
                        className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-all hover:ring-2 hover:ring-primary"
                      >
                        <img
                          src={it.thumb}
                          alt={it.title ?? ''}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  {nextPage && (
                    <div className="mt-3 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => load(provider, lastQuery.current.get(provider) ?? '', true)}
                        disabled={loading}
                      >
                        {loading ? 'Loading…' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Paste a direct image/GIF URL as a fallback */}
            <div className="flex gap-2 border-t border-border pt-3">
              <Input
                noMargin
                className="flex-1"
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="Or paste a direct image URL…"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={submitPaste}
                disabled={!pasteUrl.trim()}
              >
                Use URL
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
