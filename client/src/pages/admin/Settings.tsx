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

        <div className="grid-2 gap-6">
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
              <label>Speed Bonuses (comma-separated, 1st → 2nd → 3rd → …)</label>
              <input
                value={(cfg.speedBonuses ?? [200, 150, 100, 50]).join(', ')}
                onChange={e => {
                  const vals = e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n));
                  update('speedBonuses', vals);
                }}
              />
              <p className="text-xs text-muted mt-1">e.g. 200, 150, 100, 50 — 1st correct answer gets +200, 2nd gets +150, etc.</p>
            </div>

            <div className="form-group flex items-center gap-3" style={{ marginBottom: 0 }}>
              <input type="checkbox" id="lateJoin" style={{ width: 'auto' }}
                checked={cfg.allowLateJoin ?? false}
                onChange={e => update('allowLateJoin', e.target.checked)} />
              <label htmlFor="lateJoin" style={{ marginBottom: 0 }}>Allow late join (players can join mid-game)</label>
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
              ⚠️ After changing credentials, you'll be logged out and need to log back in.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
