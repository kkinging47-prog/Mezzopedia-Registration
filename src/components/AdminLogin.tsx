import { FormEvent, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { BrandHeader } from './BrandHeader';

interface Props {
  logo: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

export function AdminLogin({ logo, onBack, onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const validUser = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
    const validPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (username.trim() === validUser && password === validPassword) {
      setError('');
      onSuccess();
      return;
    }
    setError('Invalid username or password.');
  }

  return (
    <section className="page page--login">
      <BrandHeader logo={logo} small />
      <form className="panel login-panel" onSubmit={submit}>
        <button type="button" className="ghost-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back to student search
        </button>
        <div className="login-icon"><LockKeyhole size={30} /></div>
        <h2>Admin Login</h2>
        <p className="subtle">Manage students, adults, payment status, Excel uploads, proof of payment, and notifications.</p>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
        </label>
        <label>
          Password
          <div className="password-box">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <div className="notice error">{error}</div>}
        <button className="primary-button" type="submit">Login to Dashboard</button>
      </form>
    </section>
  );
}
