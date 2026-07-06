import { type FormEvent, useEffect, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { AvatarPicker, saveAvatar } from '@/components/AvatarPicker';
import { Input } from '@/components/Input';
import { MainContent, Page, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import UserNav from '@/components/UserNav';
import { useAuth } from '@/context/AuthContext';

export default function UserSettings() {
  const { token, user, updatePlayProfile } = useAuth();
  const [playName, setPlayName] = useState('');
  const [playAvatar, setPlayAvatar] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPlayName(user.playDisplayName?.trim() || user.username || '');
    setPlayAvatar(user.playAvatar?.trim() || '');
  }, [user]);

  async function handlePlayProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    const cleanName = playName.trim();
    if (!cleanName) {
      setProfileError('Display name is required');
      return;
    }
    setProfileSaving(true);
    const res = await fetch('/api/auth/play-profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName: cleanName, avatar: playAvatar }),
    });
    const data = await res.json();
    setProfileSaving(false);
    if (!res.ok) {
      setProfileError((data.error as string) ?? 'Could not save play profile');
      return;
    }
    updatePlayProfile(data.playDisplayName as string, (data.playAvatar as string | null) ?? '');
    if (playAvatar) saveAvatar(playAvatar);
    setProfileSuccess('Play profile saved');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Password change failed');
      return;
    }
    setSuccess('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
  }

  return (
    <Page>
      <UserNav />
      <MainContent className="max-w-[520px]">
        <h1>Account Settings</h1>
        <Subtitle className="mb-6">Manage your quiz creator account</Subtitle>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-4">Account</h2>
            <p>
              <span className="text-muted-foreground">Name:</span> {user?.username}
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">Email:</span> {user?.email}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-1">Play profile</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Default name and avatar when you join a game. You can still change them each time.
            </p>
            {profileError && <AppAlert variant="error">{profileError}</AppAlert>}
            {profileSuccess && <AppAlert variant="success">{profileSuccess}</AppAlert>}
            <form onSubmit={handlePlayProfileSubmit}>
              <Input
                id="playName"
                label="Display name in games"
                type="text"
                maxLength={24}
                required
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
              />
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium">Avatar</p>
                <AvatarPicker value={playAvatar} onChange={setPlayAvatar} />
              </div>
              <Button type="submit" disabled={profileSaving} variant="default">
                {profileSaving ? 'Saving…' : 'Save play profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4">Change password</h2>
            {error && <AppAlert variant="error">{error}</AppAlert>}
            {success && <AppAlert variant="success">{success}</AppAlert>}
            <form onSubmit={handleSubmit}>
              <Input
                id="currentPassword"
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                id="newPassword"
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button type="submit" disabled={saving} variant="default">
                {saving ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MainContent>
    </Page>
  );
}
