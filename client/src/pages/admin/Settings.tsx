import { type ChangeEvent, useEffect, useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import type { AppConfig } from '../../types';

export default function Settings() {
  const { token } = useAuth();
  const [cfg, setCfg] = useState<Partial<AppConfig> | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [uploadingAvatars, setUploadingAvatars] = useState(false);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[] | null>(null);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setCfg);

    fetch('/api/avatars')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load avatars');
        return r.json();
      })
      .then((urls: string[]) => {
        setAvailableAvatars(urls);
        setAvatarsError(null);
      })
      .catch(() => {
        setAvailableAvatars([]);
        setAvatarsError('Could not load current avatars.');
      });
  }, [token]);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    const payload: Record<string, unknown> = { ...cfg };
    if (newPassword.trim()) payload.adminPassword = newPassword.trim();
    await fetch('/api/admin/config', {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
    setNewPassword('');
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleAvatarBulkUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAvatarUploadMessage(null);
    setUploadingAvatars(true);

    try {
      const toDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

      const dataUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const url = await toDataUrl(files[i] as File);
        dataUrls.push(url);
      }

      const res = await fetch('/api/admin/avatars/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ dataUrls }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Upload failed');
      }

      const payload = await res.json().catch(() => ({}));
      const created = Array.isArray(payload.urls) ? payload.urls.length : 0;
      setAvatarUploadMessage(
        created > 0
          ? `Uploaded ${created} new avatar${created === 1 ? '' : 's'}. They will appear in the avatar picker.`
          : 'Upload completed, but no new avatars were created.',
      );
    } catch (err) {
      console.error(err);
      setAvatarUploadMessage('Could not upload avatars. Please try again with valid image files.');
    } finally {
      setUploadingAvatars(false);
      e.target.value = '';
    }
  }

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (!cfg)
    return (
      <div className="page">
        <AdminNav />
        <div className="page-center">
          <p className="text-muted">Loading…</p>
        </div>
      </div>
    );

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Settings</h1>
            <p className="subtitle">Adjust game behaviour and admin credentials</p>
          </div>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-lg">
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>

        {saved && <div className="alert alert-success">Settings saved successfully.</div>}

        {/* Branding */}
        <div className="card mb-6" style={{ maxWidth: 480 }}>
          <h2 className="mb-1">✏️ App Name</h2>
          <p className="text-sm text-muted mb-4">
            Shown as{' '}
            <strong style={{ color: 'var(--text)' }}>
              "{(cfg.appName ?? '').trim() || 'Scaleway'} by ⚡ Quizz"
            </strong>{' '}
            — leave blank to show just <strong style={{ color: 'var(--text)' }}>⚡ Quizz</strong>
          </p>
          <Input
            label="Organisation / Event name"
            placeholder="e.g. Scaleway   (leave blank for default)"
            value={cfg.appName ?? ''}
            onChange={(e) => update('appName', e.target.value)}
            noMargin
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
          }}
        >
          {/* Game settings */}
          <div className="card">
            <h2 className="mb-4">⏱ Game Settings</h2>

            <Input
              label="Default Question Time (seconds)"
              type="number"
              min={5}
              max={120}
              value={cfg.questionTimeSec ?? 20}
              onChange={(e) => update('questionTimeSec', Number(e.target.value))}
            />

            <Input
              label="Default Base Score"
              type="number"
              min={0}
              step={50}
              value={cfg.defaultBaseScore ?? 500}
              onChange={(e) => update('defaultBaseScore', Number(e.target.value))}
            />

            <Input
              label="Default Speed Bonus (for players beyond top list)"
              type="number"
              min={0}
              step={5}
              value={cfg.defaultSpeedBonus ?? 25}
              onChange={(e) => update('defaultSpeedBonus', Number(e.target.value))}
            />

            <Input
              label="Max Players Per Session"
              type="number"
              min={2}
              max={500}
              value={cfg.maxPlayersPerSession ?? 50}
              onChange={(e) => update('maxPlayersPerSession', Number(e.target.value))}
            />

            <div className="form-group">
              <p className="form-label">Speed Bonuses (1st correct → 2nd → 3rd → …)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                {(cfg.speedBonuses ?? [200, 150, 100, 50]).map((val, i) => (
                  <div key={`speed-${i + 1}`} className="flex items-center gap-2">
                    <span style={{ fontSize: '0.78rem', color: 'var(--text2)', minWidth: 54 }}>
                      {i + 1}
                      {i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} correct
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={val}
                      style={{ maxWidth: 110 }}
                      onChange={(e) => {
                        const bonuses = [...(cfg.speedBonuses ?? [])];
                        bonuses[i] = Number(e.target.value);
                        update('speedBonuses', bonuses);
                      }}
                    />
                    {(cfg.speedBonuses ?? []).length > 1 && (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => {
                          const bonuses = (cfg.speedBonuses ?? []).filter((_, idx) => idx !== i);
                          update('speedBonuses', bonuses);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => update('speedBonuses', [...(cfg.speedBonuses ?? []), 0])}
              >
                + Add Tier
              </button>
              <p className="text-xs text-muted mt-2">
                Players beyond the last tier use the Default Speed Bonus above.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="results-auto-advance-sec">Results Screen Duration (seconds)</label>
              <p className="text-xs text-muted mb-2">
                How long to show results before auto-advancing. Set to <strong>0</strong> for
                manual-only (admin clicks Next).
              </p>
              <Input
                id="results-auto-advance-sec"
                type="number"
                min={0}
                max={60}
                value={cfg.resultsAutoAdvanceSec ?? 5}
                onChange={(e) => update('resultsAutoAdvanceSec', Number(e.target.value))}
                noMargin
              />
            </div>

            <div className="form-group flex items-center gap-3" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                id="lateJoin"
                style={{ width: 'auto' }}
                checked={cfg.allowLateJoin ?? false}
                onChange={(e) => update('allowLateJoin', e.target.checked)}
              />
              <label htmlFor="lateJoin" style={{ marginBottom: 0 }}>
                Allow late join (players can join mid-game)
              </label>
            </div>
          </div>

          {/* Streak bonus settings */}
          <div className="card">
            <h2 className="mb-4">🔥 Streak Bonus</h2>
            <p className="text-sm text-muted mb-4">
              Award extra points when a player answers correctly multiple times in a row.
            </p>

            <div className="form-group flex items-center gap-3">
              <input
                type="checkbox"
                id="streakEnabled"
                style={{ width: 'auto' }}
                checked={cfg.streakBonusEnabled ?? true}
                onChange={(e) => update('streakBonusEnabled', e.target.checked)}
              />
              <label htmlFor="streakEnabled" style={{ marginBottom: 0 }}>
                Enable streak bonus
              </label>
            </div>

            <Input
              label="Streak starts at (minimum consecutive correct answers)"
              type="number"
              min={2}
              max={10}
              value={cfg.streakMinimum ?? 2}
              onChange={(e) => update('streakMinimum', Number(e.target.value))}
              disabled={!(cfg.streakBonusEnabled ?? true)}
              hint="e.g. 2 means bonus kicks in on the 3rd correct answer in a row"
            />

            <Input
              label="Bonus points per extra streak level"
              noMargin
              type="number"
              min={0}
              step={10}
              value={cfg.streakBonusBase ?? 50}
              onChange={(e) => update('streakBonusBase', Number(e.target.value))}
              disabled={!(cfg.streakBonusEnabled ?? true)}
              hint="e.g. 50 pts → 3-streak: +50, 4-streak: +100, 5-streak: +150…"
            />
          </div>

          {/* Admin credentials */}
          <div className="card">
            <h2 className="mb-4">🔐 Admin Credentials</h2>

            <Input
              label="Admin Username"
              value={cfg.adminUsername ?? 'admin'}
              onChange={(e) => update('adminUsername', e.target.value)}
            />

            <Input
              label={
                <>
                  New Password <span className="text-muted">(leave blank to keep current)</span>
                </>
              }
              type="password"
              value={newPassword}
              placeholder="Enter new password"
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="alert alert-warn mt-4" style={{ fontSize: '0.85rem' }}>
              ⚠️ After changing credentials, you&apos;ll be logged out and need to log back in.
            </div>
          </div>

          {/* Avatar / emoji library */}
          <div className="card">
            <h2 className="mb-2">😊 Avatar & Emoji Library</h2>
            <p className="text-sm text-muted mb-4">
              Upload one or more small emoji-style images to make them available as avatars for
              players. These will be stored on the server and automatically appear in the avatar
              picker.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="avatar-bulk-upload" className="mb-2">
                Bulk upload emoji avatars
              </label>
              <input
                id="avatar-bulk-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleAvatarBulkUpload}
                disabled={uploadingAvatars}
              />
              <p className="text-xs text-muted mt-2">
                Recommended: square images (e.g. 128×128) in PNG, JPG, GIF, SVG, or WebP format.
              </p>
            </div>

            {avatarUploadMessage && (
              <div className="alert mt-3" style={{ fontSize: '0.85rem' }}>
                {avatarUploadMessage}
              </div>
            )}

            <div className="mt-4">
              <h3 className="mb-2" style={{ fontSize: '0.9rem' }}>
                Available avatars
              </h3>
              {availableAvatars === null && !avatarsError && (
                <p className="text-sm text-muted">Loading current avatars…</p>
              )}
              {avatarsError && <p className="text-sm text-muted">{avatarsError}</p>}
              {availableAvatars && availableAvatars.length === 0 && !avatarsError && (
                <p className="text-sm text-muted">
                  No avatars found yet. Upload some above to populate the library.
                </p>
              )}
              {availableAvatars && availableAvatars.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {availableAvatars.map((url) => (
                    <div
                      key={url}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        border: '2px solid var(--border)',
                        background: 'var(--surface2)',
                        padding: 3,
                        overflow: 'hidden',
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
