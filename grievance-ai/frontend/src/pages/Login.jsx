import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { FiCpu, FiGitMerge, FiZap } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const { loginWithGoogle, loginWithEmail, register } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'register') await register(form.name, form.email, form.password);
      else await loginWithEmail(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <p className="font-display text-xl font-bold">Civ<span className="text-civic">ora</span></p>
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            One complaint.<br />The <span className="text-civic">right department.</span><br />Every time.
          </h1>
          <ul className="mt-8 space-y-4 text-slate-300">
            <li className="flex items-start gap-3"><FiCpu className="mt-1 shrink-0 text-civic" /> Local AI reads your complaint — categorises it, sets priority and writes a summary.</li>
            <li className="flex items-start gap-3"><FiZap className="mt-1 shrink-0 text-civic" /> Auto-routed to the correct department in seconds, with live status updates.</li>
            <li className="flex items-start gap-3"><FiGitMerge className="mt-1 shrink-0 text-civic" /> 100 people reporting one pothole? Merged into a single, louder case.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-400">Runs on Ollama — your data never leaves the server.</p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">Report civic issues and track them to resolution.</p>

          <GoogleLogin
            onSuccess={(res) => loginWithGoogle(res.credential).catch(() => setError('Google sign-in failed.'))}
            onError={() => setError('Google sign-in failed.')}
            width="340"
          />

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or with email <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <input className="input" placeholder="Full name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            )}
            <input className="input" type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="input" type="password" placeholder="Password (6+ characters)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button className="btn-civic w-full justify-center" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button className="mt-4 text-sm text-ink-soft underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
