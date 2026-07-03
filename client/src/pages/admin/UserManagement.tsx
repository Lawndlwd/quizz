import { useCallback, useEffect, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { MainContent, Page, Subtitle } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import AdminNav from '../../components/AdminNav';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import type { UserAccount } from '../../types';

export default function UserManagement() {
  const api = useAuthFetch();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState<{ id: number; password: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { ok, data } = await api.get<{ users?: UserAccount[] }>('/api/admin/users');
    if (!ok) {
      setError('Failed to load users');
      setLoading(false);
      return;
    }
    setUsers(data?.users ?? []);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function banUser(id: number) {
    setActionId(id);
    await api.post(`/api/admin/users/${id}/ban`);
    setActionId(null);
    load();
  }

  async function unbanUser(id: number) {
    setActionId(id);
    await api.post(`/api/admin/users/${id}/unban`);
    setActionId(null);
    load();
  }

  async function resetUserPassword(id: number) {
    if (!confirm('Generate a new password for this user?')) return;
    setActionId(id);
    const { ok, data } = await api.post<{ password?: string; error?: string }>(
      `/api/admin/users/${id}/reset-password`,
      {},
    );
    setActionId(null);
    if (ok && data?.password) setResetPassword({ id, password: data.password });
    else setError(data?.error ?? 'Reset failed');
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user? Their quizzes will become unowned.')) return;
    setActionId(id);
    await api.delete(`/api/admin/users/${id}`);
    setActionId(null);
    load();
  }

  return (
    <Page>
      <AdminNav />
      <MainContent>
        <h1>User Management</h1>
        <Subtitle className="mb-6">Manage registered quiz creators</Subtitle>

        {error && <AppAlert variant="error">{error}</AppAlert>}
        {resetPassword && (
          <AppAlert variant="success">
            New password for user #{resetPassword.id}: <code>{resetPassword.password}</code> — copy
            it now, it won&apos;t be shown again.
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setResetPassword(null)}
            >
              Dismiss
            </Button>
          </AppAlert>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-12 text-center">
              <p className="text-muted-foreground">No registered users yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-6xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Quizzes</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.username}</td>
                      <td className="px-4 py-3">{u.quiz_count}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-semibold uppercase',
                            u.is_banned
                              ? 'border-border bg-muted text-muted-foreground'
                              : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
                          )}
                        >
                          {u.is_banned ? 'banned' : 'active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {u.is_banned ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={actionId === u.id}
                              onClick={() => unbanUser(u.id)}
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={actionId === u.id}
                              onClick={() => banUser(u.id)}
                            >
                              Ban
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={actionId === u.id}
                            onClick={() => resetUserPassword(u.id)}
                          >
                            Reset pw
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={actionId === u.id}
                            onClick={() => deleteUser(u.id)}
                            className="text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </MainContent>
    </Page>
  );
}
