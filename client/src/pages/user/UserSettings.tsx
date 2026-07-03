import { type FormEvent, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { MainContent, Page, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '../../components/Input';
import UserNav from '../../components/UserNav';
import { useAuth } from '../../context/AuthContext';

export default function UserSettings() {
  const { token, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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
            <h2 className="mb-4">Profile</h2>
            <p>
              <span className="text-muted-foreground">Name:</span> {user?.username}
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">Email:</span> {user?.email}
            </p>
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
