import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { loginSuperAdmin } = useAuth();
  const { appName } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await loginSuperAdmin(username, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/admin');
  }

  return (
    <PageCenter>
      <AuthCard>
        <div className="text-center mb-6">
          <AppLogo>
            {appName ? (
              <>
                {appName}{' '}
                <span className="mt-1 block text-[0.6em] font-normal text-muted-foreground opacity-85">
                  by ⚡ Quizz
                </span>
              </>
            ) : (
              '⚡ Quizz'
            )}
          </AppLogo>
          <Subtitle className="mt-2">Admin Panel</Subtitle>
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}

        <form onSubmit={handleSubmit}>
          <Input
            id="username"
            label="Username"
            type="text"
            autoComplete="username"
            placeholder="admin"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            disabled={loading}
            variant="default"
            size="lg"
            className="mt-2 w-full"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </AuthCard>
    </PageCenter>
  );
}
