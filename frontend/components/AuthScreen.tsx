import React, { useState } from 'react';
import { ArrowRight, Boxes, Eye, EyeOff, LockKeyhole, Mail, Warehouse } from 'lucide-react';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

interface Props {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { full_name: fullName, email, password }
            : { email, password },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? 'We could not complete your request.');
      }
      onAuthenticated(data as AuthUser);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? 'Could not reach the sign-in service. Check that the API server is running and try again.'
          : requestError instanceof Error
            ? requestError.message
            : 'We could not complete your request.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Warehouse Digital Twin">
        <div className="auth-brand">
          <span className="auth-brand-mark"><Warehouse size={21} strokeWidth={2.2} /></span>
          <span>WAREHOUSE <b>DIGITAL TWIN</b></span>
        </div>
        <div className="auth-story-copy">
          <span className="auth-eyebrow"><span /> OPERATIONS, IN FULL VIEW</span>
          <h1>Make every<br />square metre<br /><em>work smarter.</em></h1>
          <p>Design your floor. Test your flow. Find the layout that moves your operation forward.</p>
        </div>
        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-label"><span><i /> LIVE FLOOR PLAN</span><span>ZONE A — 01</span></div>
          <div className="auth-floor">
            {Array.from({ length: 64 }, (_, index) => {
              const aisle = [2, 3, 6, 7].includes(index % 8);
              const station = [24, 31, 56].includes(index);
              return <i key={index} className={station ? 'is-station' : aisle ? 'is-aisle' : ''} />;
            })}
          </div>
          <div className="auth-visual-footer"><span><i className="auth-legend-shelf" /> STORAGE</span><span><i className="auth-legend-route" /> PICK ROUTE</span><span><i className="auth-legend-station" /> STATION</span></div>
        </div>
        <div className="auth-story-foot"><span>PLAN WITH PRECISION.</span><span>MOVE WITH PURPOSE.</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><span className="auth-brand-mark"><Warehouse size={20} /></span> WAREHOUSE <b>DIGITAL TWIN</b></div>
        <div className="auth-form-wrap">
          <div className="auth-form-kicker"><span className="auth-form-kicker-icon"><Boxes size={16} /></span> YOUR WORKSPACE</div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Sign in to pick up where your operation left off.' : 'Set up your account and start designing smarter.'}
          </p>

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label className="auth-field">
                <span>Full name</span>
                <div className="auth-input-wrap"><input autoComplete="name" required maxLength={80} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your name" /></div>
              </label>
            )}
            <label className="auth-field">
              <span>Work email</span>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" />
              </div>
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'} />
                <button className="auth-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              {mode === 'register' && <small className="auth-field-hint">Use at least 12 characters.</small>}
            </label>

            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in to workspace' : 'Create account'}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? 'New to the workspace?' : 'Already have an account?'}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
          <div className="auth-secure-note"><LockKeyhole size={14} /> Your sign-in is protected with encrypted credentials.</div>
        </div>
        <footer className="auth-panel-foot"><span>WAREHOUSE DIGITAL TWIN</span><span>DESIGNED FOR WHAT'S NEXT</span></footer>
      </section>
    </main>
  );
};
