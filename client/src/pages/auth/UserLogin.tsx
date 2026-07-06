import { Zap } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function UserLogin() {
  const { login } = useAuth();
  const { appName } = useApp();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(result.role === 'super_admin' ? '/admin' : '/u');
  }

  return (
    <PageCenter>
      <AuthCard>
        <div className="text-center mb-6">
          <AppLogo>
            {appName || (
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-4" /> Quizz
              </span>
            )}
          </AppLogo>
          <Subtitle className="mt-2">Sign in to create and host quizzes</Subtitle>
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}

        <form onSubmit={handleSubmit}>
          <Input
            id="identifier"
            label="Email or username"
            type="text"
            autoComplete="username"
            placeholder="you@company.com"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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

        <p className="text-center text-muted-foreground text-sm mt-4">
          No account? <Link to="/register">Register</Link>
        </p>
        <p className="text-center text-muted-foreground text-sm mt-2">
          <Link to="/play">Join a game</Link> · <Link to="/">Home</Link>
        </p>
      </AuthCard>
    </PageCenter>
  );
}
