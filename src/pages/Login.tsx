import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { signin, user, loading } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e0e7ff', borderTopColor: '#5B4FE8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  function validate() {
    const e: { [k: string]: string } = {};
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email address';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setFormLoading(true);
      setErrors({});
      await signin(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Login failed. Please check your credentials.' });
    } finally {
      setFormLoading(false);
    }
  }

  const FF = 'ui-sans-serif,system-ui,-apple-system,sans-serif';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: FF }}>

      {/* ── LEFT: Form Panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#ffffff', position: 'relative',
      }}>
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px 0' }}>
          <Link to="/">
            <img src="/scrapify.png" alt="Scrapify" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <p style={{ fontSize: 13.5, color: '#6b7280', fontWeight: 400 }}>
            New here?{' '}
            <Link to="/signup" style={{ color: '#5B4FE8', fontWeight: 600, textDecoration: 'none' }}>
              Create account
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>

            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em', marginBottom: 6, lineHeight: 1.15 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, fontWeight: 400 }}>
              Sign in to your Scrapify account to continue.
            </p>

            {errors.submit && (
              <div style={{ marginBottom: 18, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: errors.email ? '#ef4444' : '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }}
                    placeholder="you@company.com"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px 11px 38px',
                      fontSize: 14, color: '#111827',
                      border: `1.5px solid ${errors.email ? '#fca5a5' : '#e5e7eb'}`,
                      borderRadius: 10, outline: 'none',
                      background: errors.email ? '#fff8f8' : '#f9fafb',
                      transition: 'border-color .18s, box-shadow .18s',
                      fontFamily: FF,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5B4FE8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,79,232,.1)'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.email ? '#fca5a5' : '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = errors.email ? '#fff8f8' : '#f9fafb'; }}
                  />
                </div>
                {errors.email && <p style={{ marginTop: 4, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                  <a href="#" style={{ fontSize: 12.5, color: '#5B4FE8', fontWeight: 500, textDecoration: 'none' }}>
                    Forgot password?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: errors.password ? '#ef4444' : '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }}
                    placeholder="Enter your password"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 40px 11px 38px',
                      fontSize: 14, color: '#111827',
                      border: `1.5px solid ${errors.password ? '#fca5a5' : '#e5e7eb'}`,
                      borderRadius: 10, outline: 'none',
                      background: errors.password ? '#fff8f8' : '#f9fafb',
                      transition: 'border-color .18s, box-shadow .18s',
                      fontFamily: FF,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#5B4FE8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,79,232,.1)'; e.currentTarget.style.background = '#fff'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.password ? '#fca5a5' : '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = errors.password ? '#fff8f8' : '#f9fafb'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
                {errors.password && <p style={{ marginTop: 4, fontSize: 12, color: '#ef4444' }}>{errors.password}</p>}
              </div>

              {/* Remember me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#5B4FE8', cursor: 'pointer', borderRadius: 4 }} />
                <span style={{ fontSize: 13.5, color: '#6b7280' }}>Keep me signed in for 30 days</span>
              </label>

              {/* Submit */}
              <button type="submit" disabled={formLoading}
                style={{
                  width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: formLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14.5, fontWeight: 600, color: '#fff', fontFamily: FF,
                  background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: formLoading ? 0.65 : 1,
                  transition: 'opacity .15s, transform .15s, box-shadow .2s',
                  boxShadow: '0 4px 16px rgba(91,79,232,.35)',
                }}
                onMouseOver={e => { if (!formLoading) { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(91,79,232,.45)'; } }}
                onMouseOut={e => { e.currentTarget.style.opacity = formLoading ? '0.65' : '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,79,232,.35)'; }}
              >
                {formLoading
                  ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin .7s linear infinite' }} /> Signing in…</>
                  : <>Sign in →</>}
              </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 12.5, color: '#9ca3af', textAlign: 'center' }}>
              By signing in you agree to our{' '}
              <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Terms of Service</a>{' '}and{' '}
              <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Privacy Policy</a>.
            </p>
          </div>
        </div>

        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* ── RIGHT: Purple Panel ── */}
      <div style={{
        width: '42%', minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 52px',
        background: 'linear-gradient(145deg, #5B4FE8 0%, #7C6FEF 55%, #9B89F5 100%)',
        position: 'relative', overflow: 'hidden',
      }} className="hidden md:flex">
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 16 }}>
            The data platform<br />built for speed.
          </h2>
          <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 32, maxWidth: 320 }}>
            Join 50,000+ developers extracting structured data from any source in seconds.
          </p>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 40 }}>
            {[
              'AI-powered extraction from any page',
              'Bank-grade security & isolation',
              'Real-time data pipelines',
              'Free plan',
            ].map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: 400 }}>{f}</span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 28 }} />

          {/* Testimonial */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700, border: '2px solid rgba(255,255,255,0.3)',
            }}>SC</div>
            <div>
              <p style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 2 }}>Sarah Chen</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Head of Data, Northwind</p>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "Scrapify replaced three internal tools. We ship data pipelines in hours."
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
