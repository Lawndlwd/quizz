import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function UserRegister() {
  const { registerUser } = useAuth();
  const { appName, allowedDomain } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const domainHint = allowedDomain ? `@${allowedDomain}` : 'configured domain';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await registerUser(email, password, username);
    setLoading(false);
    if (err) setError(err);
    else navigate('/u');
  }

  return (
    <PageCenter>
      <AuthCard>
        <div className="text-center mb-6">
          <AppLogo>{appName || '⚡ Quizz'}</AppLogo>
          <Subtitle className="mt-2">Create your quiz creator account</Subtitle>
          {allowedDomain && (
            <p className="text-muted-foreground text-sm mt-2">
              Use an email ending in {domainHint}
            </p>
          )}
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}

        {!allowedDomain && (
          <AppAlert variant="error" className="mb-4">
            Registration is currently disabled (no allowed domain configured).
          </AppAlert>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder={allowedDomain ? `you@${allowedDomain}` : 'you@company.com'}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!allowedDomain}
          />
          <Input
            id="username"
            label="Display name"
            type="text"
            autoComplete="username"
            placeholder="Your name"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!allowedDomain}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!allowedDomain}
          />
          <Button
            type="submit"
            disabled={loading || !allowedDomain}
            variant="default"
            size="lg"
            className="mt-2 w-full"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-4">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="text-center text-muted-foreground text-sm mt-2">
          <Link to="/play">Join a game</Link> · <Link to="/">Home</Link>
        </p>
      </AuthCard>
    </PageCenter>
  );
}
