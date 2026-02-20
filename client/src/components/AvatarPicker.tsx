import { type ChangeEvent, useEffect, useRef, useState } from 'react';

const AVATAR_KEY = 'quizz_avatar';

// Emoji fallbacks shown while the server list is loading or if it returns empty
const FALLBACK_EMOJIS = [
  '🦊',
  '🦁',
  '🐸',
  '🦄',
  '🐧',
  '🦋',
  '🦈',
  '🦑',
  '🤖',
  '👾',
  '🎮',
  '🎯',
  '⚡',
  '🌈',
  '🔥',
  '🐉',
  '🦅',
  '🐺',
  '🐙',
  '🎭',
];

export function loadSavedAvatar(): string {
  return localStorage.getItem(AVATAR_KEY) ?? FALLBACK_EMOJIS[0];
}

export function saveAvatar(avatar: string) {
  localStorage.setItem(AVATAR_KEY, avatar);
}

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [serverUrls, setServerUrls] = useState<string[] | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch('/api/avatars')
      .then((r) => r.json())
      .then((urls: string[]) => setServerUrls(urls))
      .catch(() => {
        setFetchError(true);
        setServerUrls([]);
      });
  }, []);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 128;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Center-crop to circle
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      onChange(dataUrl);
      e.target.value = '';
    };
    img.src = url;
  }

  const isImage = value.startsWith('data:') || value.startsWith('/avatars/');
  const loading = serverUrls === null;
  const options = serverUrls && serverUrls.length > 0 ? serverUrls : fetchError ? null : null;

  return (
    <div>
      {/* Preview + upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <AvatarDisplay avatar={value} size={72} />
        <div>
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text2)',
              fontWeight: 600,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Your avatar
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-ghost btn-sm"
          >
            {isImage ? '↺ Change photo' : '↑ Upload photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
      </div>

      {/* Server avatars or fallback emojis */}
      <p
        style={{
          fontSize: '0.78rem',
          color: 'var(--text2)',
          fontWeight: 600,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {loading ? 'Loading avatars…' : 'Or pick one'}
      </p>

      {loading && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }, (_, i) => i).map((i) => (
            <div
              key={`skeleton-${i}`}
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                background: 'var(--surface2)',
                border: '2px solid var(--border)',
                animation: 'pulse .8s infinite alternate',
              }}
            />
          ))}
        </div>
      )}

      {!loading && options && options.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {options.map((url) => {
            const selected = value === url;
            return (
              <button
                type="button"
                key={url}
                onClick={() => onChange(url)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  padding: 3,
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'rgba(124,58,237,.18)' : 'var(--surface2)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: selected ? '0 0 0 3px rgba(124,58,237,.25)' : 'none',
                  transition: 'all .15s',
                  flexShrink: 0,
                }}
              >
                <img
                  src={url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: 6,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Fallback: show emoji chars if server returned empty list */}
      {!loading && (!options || options.length === 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FALLBACK_EMOJIS.map((emoji) => {
            const selected = value === emoji;
            return (
              <button
                type="button"
                key={emoji}
                onClick={() => onChange(emoji)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 10,
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'rgba(124,58,237,.18)' : 'var(--surface2)',
                  fontSize: '1.6rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: selected ? '0 0 0 3px rgba(124,58,237,.25)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Standalone avatar display ──────────────────────────────────────────────────

interface AvatarDisplayProps {
  avatar?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function AvatarDisplay({ avatar, size = 36, style }: AvatarDisplayProps) {
  const isImage = avatar?.startsWith('data:') || avatar?.startsWith('/avatars/');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid var(--border)',
        background: 'var(--surface2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        fontSize: size * 0.52,
        ...style,
      }}
    >
      {isImage ? (
        <img
          src={avatar}
          alt="avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        (avatar ?? '🎮')
      )}
    </div>
  );
}
