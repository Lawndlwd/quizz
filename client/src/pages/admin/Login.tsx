import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await login(username, password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/admin');
  }

  return (
    <div className="page-center">
      <div className="card">
        <div className="text-center mb-6">
          <div className="logo">⚡ Quizz</div>
          <p className="subtitle mt-2">Admin Panel</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <Input
            id="username" label="Username" type="text" autoComplete="username"
            placeholder="admin" required value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <Input
            id="password" label="Password" type="password" autoComplete="current-password"
            placeholder="••••••••" required value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
