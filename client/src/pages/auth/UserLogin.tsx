import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function UserLogin() {
  const { loginUser } = useAuth();
  const { appName } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await loginUser(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/u');
  }

  return (
    <PageCenter>
      <AuthCard>
        <div className="text-center mb-6">
          <AppLogo>{appName || '⚡ Quizz'}</AppLogo>
          <Subtitle className="mt-2">Sign in to create quizzes</Subtitle>
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}

        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
