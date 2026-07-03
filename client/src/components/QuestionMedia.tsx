import { useEffect, useRef, useState } from 'react';
import { parseYouTubeId, parseYouTubeStart } from '@/helpers';
import { cn } from '@/lib/utils';

const EQ_BARS = Array.from({ length: 32 }, (_, i) => `bar-${i}`);

interface Props {
  url?: string;
  kind?: 'audio' | 'video';
  className?: string;
  /** Autoplay on mount. True in-game; pass false for editor previews. */
  autoPlay?: boolean;
}

/**
 * YouTube-backed question media.
 * - video: responsive 16:9 embedded player.
 * - audio: the player is rendered off-screen (so only the sound is heard, no
 *   picture) behind a custom audio card with a play/pause control. Playback is
 *   driven via the IFrame postMessage API (enablejsapi=1).
 */
export function QuestionMedia({ url, kind, className, autoPlay = true }: Props) {
  const id = parseYouTubeId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Never assume autoplay succeeded — browsers block unmuted autoplay without a
  // user gesture. The player's onStateChange messages drive this instead.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (kind !== 'audio') return;
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      let data: { info?: { playerState?: number } };
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const state = data?.info?.playerState;
      // 1 = playing, 3 = buffering (about to play)
      if (typeof state === 'number') setPlaying(state === 1 || state === 3);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [kind]);

  if (!id || !kind) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const common = `rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  const autoParam = autoPlay ? '&autoplay=1' : '';
  const start = parseYouTubeStart(url);
  const startParam = start > 0 ? `&start=${start}` : '';
  const videoSrc = `https://www.youtube.com/embed/${id}?${common}${autoParam}${startParam}`;
  // Audio: loop (repeat) with no on-screen controls; autoplay only when requested.
  const audioSrc = `https://www.youtube.com/embed/${id}?${common}${autoParam}${startParam}&loop=1&playlist=${id}&controls=0`;

  if (kind === 'video') {
    return (
      <div
        className={cn(
          'mx-auto aspect-video w-full max-w-[820px] overflow-hidden rounded-xl border border-border bg-black',
          className,
        )}
      >
        <iframe
          src={videoSrc}
          title="Question video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  function command(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    );
  }
  function toggle() {
    if (playing) {
      command('pauseVideo');
      setPlaying(false);
    } else {
      command('playVideo');
      setPlaying(true);
    }
  }
  function replay() {
    command('seekTo', [start, true]);
    command('playVideo');
    setPlaying(true);
  }

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-[560px] flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card px-5 py-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">🎵 Audio</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground transition hover:brightness-110"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={replay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg text-secondary-foreground transition hover:brightness-125"
            aria-label="Replay from start"
            title="Replay from start"
          >
            ↻
          </button>
        </div>
      </div>
      {/* Full-width equalizer */}
      <div className="flex h-12 w-full items-center gap-[3px]" aria-hidden>
        {EQ_BARS.map((bar, i) => (
          <span
            key={bar}
            className="min-h-[3px] flex-1 rounded-full bg-primary/80"
            style={{
              height: playing ? undefined : '22%',
              animation: playing
                ? `eqBar ${0.7 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.07}s infinite alternate`
                : 'none',
            }}
          />
        ))}
      </div>
      {/* Off-screen player: audible, but the picture is never shown. */}
      <iframe
        ref={iframeRef}
        src={audioSrc}
        title="Question audio"
        className="pointer-events-none absolute -left-[9999px] top-0 h-[180px] w-[320px]"
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        onLoad={() =>
          // Handshake so the player starts posting state updates back to us.
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
            '*',
          )
        }
      />
    </div>
  );
}
