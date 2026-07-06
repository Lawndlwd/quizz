import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sound } from '@/lib/sound';

interface Props {
  className?: string;
}

/** Small icon button toggling the global sound mute (persisted in localStorage). */
export function MuteToggle({ className }: Props) {
  const [muted, setMuted] = useState(() => sound.isMuted());

  const toggle = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (!next) sound.play('blip'); // audible confirmation + unlocks audio context
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Unmute' : 'Mute'}
      style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:text-foreground',
        className,
      )}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
