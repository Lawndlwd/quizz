import { useState, useEffect } from 'react';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { AppConfig } from '../../types';

export default function Settings() {
  const { token } = useAuth();
  const [cfg, setCfg] = useState<Partial<AppConfig> | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setCfg);
  }, []);

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

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setCfg(prev => prev ? { ...prev, [key]: value } : prev);
  }

  if (!cfg) return (
    <div className="page"><AdminNav /><div className="page-center"><p className="text-muted">Loading…</p></div></div>
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
          <button onClick={save} disabled={saving} className="btn btn-primary btn-lg">
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>

        {saved && <div className="alert alert-success">Settings saved successfully.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {/* Game settings */}
          <div className="card">
            <h2 className="mb-4">⏱ Game Settings</h2>

            <div className="form-group">
              <label>Default Question Time (seconds)</label>
              <input type="number" min={5} max={120} value={cfg.questionTimeSec ?? 20}
                onChange={e => update('questionTimeSec', Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Default Base Score</label>
              <input type="number" min={0} step={50} value={cfg.defaultBaseScore ?? 500}
                onChange={e => update('defaultBaseScore', Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Default Speed Bonus (for players beyond top list)</label>
              <input type="number" min={0} step={5} value={cfg.defaultSpeedBonus ?? 25}
                onChange={e => update('defaultSpeedBonus', Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Max Players Per Session</label>
              <input type="number" min={2} max={500} value={cfg.maxPlayersPerSession ?? 50}
                onChange={e => update('maxPlayersPerSession', Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Speed Bonuses (1st correct → 2nd → 3rd → …)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                {(cfg.speedBonuses ?? [200, 150, 100, 50]).map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ fontSize: '0.78rem', color: 'var(--text2)', minWidth: 54 }}>
                      {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} correct
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={val}
                      style={{ maxWidth: 110 }}
                      onChange={e => {
                        const bonuses = [...(cfg.speedBonuses ?? [])];
                        bonuses[i] = Number(e.target.value);
                        update('speedBonuses', bonuses);
                      }}
                    />
                    {(cfg.speedBonuses ?? []).length > 1 && (
                      <button
                        className="btn-icon"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => {
                          const bonuses = (cfg.speedBonuses ?? []).filter((_, idx) => idx !== i);
                          update('speedBonuses', bonuses);
                        }}
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => update('speedBonuses', [...(cfg.speedBonuses ?? []), 0])}
              >+ Add Tier</button>
              <p className="text-xs text-muted mt-2">Players beyond the last tier use the Default Speed Bonus above.</p>
            </div>

            <div className="form-group flex items-center gap-3" style={{ marginBottom: 0 }}>
              <input type="checkbox" id="lateJoin" style={{ width: 'auto' }}
                checked={cfg.allowLateJoin ?? false}
                onChange={e => update('allowLateJoin', e.target.checked)} />
              <label htmlFor="lateJoin" style={{ marginBottom: 0 }}>Allow late join (players can join mid-game)</label>
            </div>
          </div>

          {/* Streak bonus settings */}
          <div className="card">
            <h2 className="mb-4">🔥 Streak Bonus</h2>
            <p className="text-sm text-muted mb-4">Award extra points when a player answers correctly multiple times in a row.</p>

            <div className="form-group flex items-center gap-3">
              <input type="checkbox" id="streakEnabled" style={{ width: 'auto' }}
                checked={cfg.streakBonusEnabled ?? true}
                onChange={e => update('streakBonusEnabled', e.target.checked)} />
              <label htmlFor="streakEnabled" style={{ marginBottom: 0 }}>Enable streak bonus</label>
            </div>

            <div className="form-group">
              <label>Streak starts at (minimum consecutive correct answers)</label>
              <input type="number" min={2} max={10} value={cfg.streakMinimum ?? 2}
                onChange={e => update('streakMinimum', Number(e.target.value))}
                disabled={!(cfg.streakBonusEnabled ?? true)} />
              <p className="text-xs text-muted mt-1">e.g. 2 means bonus kicks in on the 3rd correct answer in a row</p>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Bonus points per extra streak level</label>
              <input type="number" min={0} step={10} value={cfg.streakBonusBase ?? 50}
                onChange={e => update('streakBonusBase', Number(e.target.value))}
                disabled={!(cfg.streakBonusEnabled ?? true)} />
              <p className="text-xs text-muted mt-1">
                e.g. 50 pts → 3-streak: +50, 4-streak: +100, 5-streak: +150…
              </p>
            </div>
          </div>

          {/* Admin credentials */}
          <div className="card">
            <h2 className="mb-4">🔐 Admin Credentials</h2>

            <div className="form-group">
              <label>Admin Username</label>
              <input value={cfg.adminUsername ?? 'admin'}
                onChange={e => update('adminUsername', e.target.value)} />
            </div>

            <div className="form-group">
              <label>New Password <span className="text-muted">(leave blank to keep current)</span></label>
              <input type="password" value={newPassword} placeholder="Enter new password"
                onChange={e => setNewPassword(e.target.value)} />
            </div>

            <div className="alert alert-warn mt-4" style={{ fontSize: '0.85rem' }}>
              ⚠️ After changing credentials, you&apos;ll be logged out and need to log back in.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
