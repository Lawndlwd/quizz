import { type ChangeEvent, useEffect, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { FormRow, MainContent, Page, PageLoading, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input as FileInput } from '@/components/ui/input';
import AdminNav from '../../components/AdminNav';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import type { AppConfig } from '../../types';
import { SettingsFieldGroup, SettingsSection, SettingsToggle } from './components/SettingsSection';

const NAV_SECTIONS = [
  { id: 'branding', label: 'Branding', icon: '✏️' },
  { id: 'gameplay', label: 'Gameplay', icon: '⏱' },
  { id: 'scoring', label: 'Scoring', icon: '🎯' },
  { id: 'avatars', label: 'Avatars', icon: '😊' },
  { id: 'security', label: 'Security', icon: '🔐' },
] as const;

function computeSpeedBonus(position: number, totalPlayers: number, max: number, min: number) {
  if (totalPlayers <= 1) return max;
  return Math.max(Math.round(max - (max - min) * (position / (totalPlayers - 1))), min);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function SpeedBonusPreview({ max, min }: { max: number; min: number }) {
  const examples = [5, 10, 20];
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Speed bonus preview
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        {examples.map((n) => (
          <div key={n} className="flex flex-col gap-0.5">
            <strong>{n} players</strong>
            {Array.from({ length: Math.min(n, 5) }, (_, i) => {
              const bonus = computeSpeedBonus(i, n, max, min);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable list based on player count
                <span key={i}>
                  {ordinal(i + 1)} = {bonus}
                  {i < Math.min(n, 5) - 1 ? ', ' : ''}
                </span>
              );
            })}
            {n > 5 && (
              <span className="text-muted-foreground">
                {' '}
                … {ordinal(n)} = {computeSpeedBonus(n - 1, n, max, min)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandingPreview({ appName, appSubtitle }: { appName: string; appSubtitle: string }) {
  const name = appName.trim();
  const logo = name ? `${name} by ⚡ Quizz` : '⚡ Quizz';

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Join screen preview
      </p>
      <div className="py-4 text-center">
        <div className="text-xl font-extrabold bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-transparent">
          {logo}
        </div>
        {appSubtitle.trim() && (
          <p className="text-sm font-medium text-foreground mt-2">{appSubtitle.trim()}</p>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { isSuperAdmin, logout } = useAuth();
  const api = useAuthFetch();
  const [cfg, setCfg] = useState<Partial<AppConfig> | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatars, setUploadingAvatars] = useState(false);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[] | null>(null);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);
  const [dbAdmins, setDbAdmins] = useState<
    { id: number; username: string; created_at: string; last_password_change: string | null }[]
  >([]);
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>({});
  const [resettingId, setResettingId] = useState<number | null>(null);

  useEffect(() => {
    api.get<AppConfig>('/api/admin/config').then(({ ok, data }) => {
      if (ok && data) setCfg(data);
    });

    api.get<{ username?: string }>('/api/admin/me').then(({ ok, data }) => {
      if (ok && data?.username) setAdminUsername(data.username);
    });

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

    if (isSuperAdmin) {
      api
        .get<{ admins?: typeof dbAdmins }>('/api/admin/admins')
        .then(({ ok, data }) => {
          if (ok && data?.admins) setDbAdmins(data.admins);
        })
        .catch(() => {});
    }
  }, [api, isSuperAdmin]);

  async function changePassword() {
    if (!currentPassword) {
      alert('Please enter your current password');
      return;
    }
    if (!newPassword && !newUsername) {
      alert('Please enter a new password or username to change');
      return;
    }

    setChangingPassword(true);
    try {
      const body: Record<string, string> = { currentPassword };
      if (newPassword) body.newPassword = newPassword;
      if (newUsername && newUsername !== adminUsername) body.newUsername = newUsername;

      const { ok, data } = await api.post<{ error?: string }>('/api/admin/change-password', body);

      if (!ok) {
        alert(data?.error || 'Failed to change password');
        return;
      }

      alert('Password changed successfully! Please log in again.');
      await logout();
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Password change failed:', error);
      alert('Failed to change password');
    } finally {
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewUsername('');
    }
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    const { ok } = await api.put('/api/admin/config', { ...cfg });
    setSaving(false);
    if (!ok) {
      alert('Failed to save settings');
      return;
    }
    setSaved(true);
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
        const url = await toDataUrl(files[i] as File);
        dataUrls.push(url);
      }

      const { ok, data: payload } = await api.post<{ error?: string; urls?: string[] }>(
        '/api/admin/avatars/bulk',
        { dataUrls },
      );

      if (!ok) {
        throw new Error(payload?.error || 'Upload failed');
      }

      const urls = Array.isArray(payload?.urls) ? payload.urls : [];
      const created = urls.length;

      if (urls.length > 0) {
        setAvailableAvatars((prev) => [...(prev ?? []), ...urls]);
      }

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

  if (!cfg) {
    return <PageLoading nav={<AdminNav />} />;
  }

  const streakEnabled = cfg.streakBonusEnabled ?? true;

  return (
    <Page>
      <AdminNav />
      <MainContent>
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1>Settings</h1>
            <Subtitle>Configure branding, gameplay, scoring, and admin access</Subtitle>
          </div>
          <Button type="button" onClick={save} disabled={saving} size="lg">
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
          </Button>
        </header>

        {saved && <AppAlert variant="success">Settings saved successfully.</AppAlert>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
          <nav
            className="flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start"
            aria-label="Settings sections"
          >
            {NAV_SECTIONS.map(({ id, label, icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <span aria-hidden>{icon}</span>
                {label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col gap-6">
            <SettingsSection
              id="branding"
              icon="✏️"
              title="Branding"
              description="Customise how the app appears on the player join screen."
            >
              <Input
                label="Organisation / event name"
                placeholder="e.g. Scaleway (leave blank for default)"
                value={cfg.appName ?? ''}
                onChange={(e) => update('appName', e.target.value)}
                hint='Shown as "Your Name by ⚡ Quizz" — leave blank to show just ⚡ Quizz'
              />
              <Input
                label="Join page subtitle"
                placeholder="e.g. Quizz of the day — Cloud Edition"
                value={cfg.appSubtitle ?? ''}
                onChange={(e) => update('appSubtitle', e.target.value)}
                noMargin
                hint="Displayed below the logo on the join screen. Leave blank to hide."
              />
              <BrandingPreview appName={cfg.appName ?? ''} appSubtitle={cfg.appSubtitle ?? ''} />
            </SettingsSection>

            <SettingsSection
              id="gameplay"
              icon="⏱"
              title="Gameplay"
              description="Default timing and session limits for new games."
            >
              <FormRow>
                <Input
                  label="Question time (seconds)"
                  type="number"
                  min={5}
                  max={120}
                  value={cfg.questionTimeSec ?? 20}
                  onChange={(e) => update('questionTimeSec', Number(e.target.value))}
                />
                <Input
                  label="Max players per session"
                  type="number"
                  min={2}
                  max={500}
                  value={cfg.maxPlayersPerSession ?? 50}
                  onChange={(e) => update('maxPlayersPerSession', Number(e.target.value))}
                />
              </FormRow>

              <SettingsFieldGroup
                title="Results screen"
                description="How long to show results before auto-advancing. Set to 0 for manual-only (admin clicks Next)."
              >
                <Input
                  id="results-auto-advance-sec"
                  label="Duration (seconds)"
                  type="number"
                  min={0}
                  max={60}
                  value={cfg.resultsAutoAdvanceSec ?? 5}
                  onChange={(e) => update('resultsAutoAdvanceSec', Number(e.target.value))}
                  noMargin
                />
              </SettingsFieldGroup>

              <SettingsFieldGroup
                title="Post-game"
                description="What to show on the final podium screen after a game ends."
              >
                <SettingsToggle
                  id="choose-quiz-maker"
                  label="Pick the next quiz maker"
                  description="On the final podium, show a picker where you check players and spin to randomly choose who makes the next quiz."
                  checked={cfg.chooseQuizMaker ?? false}
                  onChange={(v) => update('chooseQuizMaker', v)}
                />
              </SettingsFieldGroup>
            </SettingsSection>

            <SettingsSection
              id="scoring"
              icon="🎯"
              title="Scoring"
              description="Points awarded for correct answers, speed, and streaks."
            >
              <SettingsFieldGroup title="Base score">
                <Input
                  label="Default base score per question"
                  type="number"
                  min={0}
                  step={50}
                  value={cfg.defaultBaseScore ?? 500}
                  onChange={(e) => update('defaultBaseScore', Number(e.target.value))}
                  noMargin
                />
              </SettingsFieldGroup>

              <SettingsFieldGroup
                title="Speed bonus"
                description="Extra points for correct answers based on answer order. 1st correct gets max, last gets min."
              >
                <FormRow>
                  <Input
                    label="Max bonus (1st correct)"
                    type="number"
                    min={0}
                    step={10}
                    value={cfg.speedBonusMax ?? 200}
                    onChange={(e) => update('speedBonusMax', Number(e.target.value))}
                    noMargin
                  />
                  <Input
                    label="Min bonus (last correct)"
                    type="number"
                    min={0}
                    step={5}
                    value={cfg.speedBonusMin ?? 10}
                    onChange={(e) => update('speedBonusMin', Number(e.target.value))}
                    noMargin
                  />
                </FormRow>
                <SpeedBonusPreview max={cfg.speedBonusMax ?? 200} min={cfg.speedBonusMin ?? 10} />
              </SettingsFieldGroup>

              <SettingsFieldGroup
                title="Streak bonus"
                description="Reward players who answer correctly multiple times in a row."
              >
                <SettingsToggle
                  id="streakEnabled"
                  label="Enable streak bonus"
                  description="Adds bonus points on consecutive correct answers"
                  checked={streakEnabled}
                  onChange={(checked) => update('streakBonusEnabled', checked)}
                />
                <FormRow>
                  <Input
                    label="Streak starts at"
                    type="number"
                    min={2}
                    max={10}
                    value={cfg.streakMinimum ?? 2}
                    onChange={(e) => update('streakMinimum', Number(e.target.value))}
                    disabled={!streakEnabled}
                    hint="Minimum consecutive correct answers before bonus kicks in"
                  />
                  <Input
                    label="Bonus per streak level"
                    type="number"
                    min={0}
                    step={10}
                    value={cfg.streakBonusBase ?? 50}
                    onChange={(e) => update('streakBonusBase', Number(e.target.value))}
                    disabled={!streakEnabled}
                    hint="e.g. 50 → 3-streak: +50, 4-streak: +100…"
                    noMargin
                  />
                </FormRow>
              </SettingsFieldGroup>
            </SettingsSection>

            <SettingsSection
              id="avatars"
              icon="😊"
              title="Avatar library"
              description="Upload emoji-style images for players to pick as avatars."
            >
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 transition hover:border-blue-500/50 hover:bg-muted/40">
                <FileInput
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAvatarBulkUpload}
                  disabled={uploadingAvatars}
                  className="hidden"
                />
                <span className="text-3xl" aria-hidden>
                  📤
                </span>
                <span className="font-semibold">
                  {uploadingAvatars ? 'Uploading…' : 'Click to upload avatars'}
                </span>
                <span className="text-center text-xs text-muted-foreground">
                  PNG, JPG, GIF, SVG, or WebP — square images around 128×128 work best
                </span>
              </label>

              {avatarUploadMessage && (
                <AppAlert variant="info" className="mt-4">
                  {avatarUploadMessage}
                </AppAlert>
              )}

              <SettingsFieldGroup title="Available avatars">
                {availableAvatars === null && !avatarsError && (
                  <p className="text-sm text-muted-foreground">Loading current avatars…</p>
                )}
                {avatarsError && <p className="text-sm text-muted-foreground">{avatarsError}</p>}
                {availableAvatars && availableAvatars.length === 0 && !avatarsError && (
                  <p className="text-sm text-muted-foreground">
                    No avatars yet. Upload some above to populate the library.
                  </p>
                )}
                {availableAvatars && availableAvatars.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {availableAvatars.map((url) => (
                      <div
                        key={url}
                        className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </SettingsFieldGroup>
            </SettingsSection>

            <SettingsSection
              id="security"
              icon="🔐"
              title="Security"
              description={
                isSuperAdmin
                  ? 'Manage database admin accounts.'
                  : 'Update your admin username and password.'
              }
            >
              {isSuperAdmin ? (
                <>
                  <AppAlert variant="warn" className="mb-4">
                    You are logged in as super admin. Your password is managed via the{' '}
                    <code>ADMIN_PASSWORD</code> environment variable.
                  </AppAlert>

                  {dbAdmins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No database admins found.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dbAdmins.map((admin) => (
                        <div
                          key={admin.id}
                          className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-[1fr_1fr_auto]"
                        >
                          <div className="pb-2 font-semibold text-sm sm:pb-0">{admin.username}</div>
                          <Input
                            label="New password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            value={resetPasswords[admin.id] || ''}
                            onChange={(e) =>
                              setResetPasswords((prev) => ({
                                ...prev,
                                [admin.id]: e.target.value,
                              }))
                            }
                            noMargin
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={resettingId === admin.id || !resetPasswords[admin.id]}
                            onClick={async () => {
                              setResettingId(admin.id);
                              try {
                                const { ok, data: err } = await api.post<{ error?: string }>(
                                  `/api/admin/admins/${admin.id}/reset-password`,
                                  { newPassword: resetPasswords[admin.id] },
                                );
                                if (ok) {
                                  alert(`Password reset for ${admin.username}`);
                                  setResetPasswords((prev) => ({ ...prev, [admin.id]: '' }));
                                } else {
                                  alert(err?.error || 'Reset failed');
                                }
                              } catch {
                                alert('Reset failed');
                              } finally {
                                setResettingId(null);
                              }
                            }}
                          >
                            {resettingId === admin.id ? 'Resetting…' : 'Reset'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-1 text-xs text-muted-foreground">Current username</p>
                    <p className="text-lg font-semibold">{adminUsername || '…'}</p>
                  </div>

                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="off"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required to make changes"
                  />
                  <Input
                    label="New username"
                    autoComplete="off"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={adminUsername || 'admin'}
                    hint="Leave blank to keep current username"
                  />
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    noMargin
                  />

                  <Button
                    type="button"
                    onClick={changePassword}
                    disabled={changingPassword}
                    className="mt-4"
                  >
                    {changingPassword ? 'Updating…' : 'Update credentials'}
                  </Button>

                  <AppAlert variant="warn" className="mt-4">
                    After changing credentials, you&apos;ll be logged out and need to sign in again.
                  </AppAlert>
                </>
              )}
            </SettingsSection>
          </div>
        </div>
      </MainContent>
    </Page>
  );
}
