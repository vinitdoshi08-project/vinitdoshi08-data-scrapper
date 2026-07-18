import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, CheckCircle2, CreditCard, Lock, Mail, User } from 'lucide-react';

const API_URL    = import.meta.env.VITE_API_URL as string;
const RZP_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

const PLAN_CONFIG = {
  free:    { name: 'Free', usdPrice: 0,   days: 3,   yearly: false },
  basic_m: { name: 'Basic',        usdPrice: 6,   days: 30,  yearly: false },
  basic_y: { name: 'Basic',        usdPrice: 60,  days: 365, yearly: true  },
  std_m:   { name: 'Standard',     usdPrice: 10,  days: 30,  yearly: false },
  std_y:   { name: 'Standard',     usdPrice: 108, days: 365, yearly: true  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

const FF = 'ui-sans-serif,system-ui,-apple-system,sans-serif';

// ── Input helper ──
function InputField({
  label, id, type = 'text', value, placeholder, error, icon, rightEl, onChange,
}: {
  label: string; id: string; type?: string; value: string; placeholder: string;
  error?: string; icon: React.ReactNode; rightEl?: React.ReactNode;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: error ? '#ef4444' : '#9ca3af', display: 'flex' }}>
          {icon}
        </span>
        <input id={id} type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `11px ${rightEl ? '40px' : '14px'} 11px 38px`,
            fontSize: 14, color: '#111827', fontFamily: FF,
            border: `1.5px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
            borderRadius: 10, outline: 'none',
            background: error ? '#fff8f8' : '#fff',
            transition: 'border-color .18s, box-shadow .18s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#5B4FE8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,79,232,.1)'; e.currentTarget.style.background = '#fff'; }}
          onBlur={e => { e.currentTarget.style.borderColor = error ? '#fca5a5' : '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = error ? '#fff8f8' : '#fff'; }}
        />
        {rightEl && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{rightEl}</span>
        )}
      </div>
      {error && <p style={{ marginTop: 4, fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

export function Signup() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const { signup }   = useAuth();

  const planKey = (params.get('plan') as PlanKey) || 'free';
  const planCfg = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.free;
  const isPaid  = planKey !== 'free';

  const [step, setStep]               = useState<'form' | 'processing' | 'done'>('form');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [formData, setFormData]       = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors,   setErrors]         = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg]     = useState('');
  const [agreed, setAgreed]           = useState(false);

  const [usdToInr, setUsdToInr] = useState<number>(84);
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.INR) setUsdToInr(d.rates.INR); })
      .catch(() => {});
  }, []);

  function usdToPaise(usdDollars: number): number {
    return Math.round(usdDollars * usdToInr * 100);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim())  e.fullName = 'Full name is required';
    if (!formData.email.trim())     e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email address';
    if (formData.password.length < 6)                   e.password = 'At least 6 characters';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!agreed) e.submit = 'You must agree to the Terms of Service and Privacy Policy.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      setStatusMsg('Creating your account…');
      await signup(formData.fullName, formData.email, formData.password);

      if (!isPaid) {
        setStep('done');
        setTimeout(() => navigate('/dashboard'), 1800);
        return;
      }

      setStep('processing');
      setStatusMsg('Account created! Signing you in…');

      const { supabase } = await import('../lib/supabase');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email:    formData.email,
        password: formData.password,
      });

      if (signInError || !signInData.session) {
        throw new Error('Account created but sign-in failed. Please log in manually to complete payment.');
      }

      const token = signInData.session.access_token;

      setStatusMsg('Loading payment gateway…');
      await loadRazorpayScript();

      const usdDollars  = planCfg.usdPrice;
      const amountPaise = usdToPaise(usdDollars);
      setStatusMsg('Creating payment order…');
      const orderRes = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `rcpt_${planKey}_${Date.now()}` }),
      });
      if (!orderRes.ok) {
        const e = await orderRes.json().catch(() => ({}));
        throw new Error(e.detail ?? 'Failed to create payment order. Try again.');
      }
      const { order_id, amount, currency } = await orderRes.json();

      setStatusMsg('');
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: RZP_KEY_ID, amount, currency,
          name: 'Scrapify', description: `${planCfg.name} Plan`,
          image: '/scrapify.png', order_id,
          theme: { color: '#5B4FE8' },
          prefill: { email: formData.email, name: formData.fullName },

          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              setStatusMsg('Verifying payment…');
              const vRes = await fetch(`${API_URL}/api/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              if (!vRes.ok) { const e = await vRes.json().catch(() => ({})); throw new Error(e.detail ?? 'Payment verification failed.'); }

              setStatusMsg('Activating your plan…');
              const planName = planCfg.name.toLowerCase() as 'basic' | 'standard';
              const sRes = await fetch(`${API_URL}/api/save-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token, plan: planName,
                  billing_cycle: planCfg.yearly ? 'yearly' : 'monthly',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  amount: usdDollars * 100, currency: 'USD',
                }),
              });
              if (!sRes.ok) { const e = await sRes.json().catch(() => ({})); throw new Error(e.detail ?? 'Plan activation failed.'); }

              setStep('done');
              setTimeout(() => navigate('/dashboard'), 1800);
              resolve();
            } catch (e: any) {
              setErrors({ submit: e.message });
              setStep('form');
              reject(e);
            }
          },

          modal: {
            ondismiss: () => {
              setErrors({ submit: 'Payment cancelled. You can try again from your dashboard.' });
              setStep('form');
              resolve();
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          setErrors({ submit: resp.error?.description ?? 'Payment failed. Please try again.' });
          setStep('form');
          resolve();
        });
        rzp.open();
      });

    } catch (err: any) {
      setErrors({ submit: err.message ?? 'Something went wrong. Please try again.' });
      setStep('form');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  }

  // ── Success screen ──
  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FF }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 360 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            {isPaid ? '🎉 Plan activated!' : 'Account created!'}
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
            {isPaid ? `Your ${planCfg.name} plan is now active.` : 'Your 3-day free trial has started.'}
          </p>
          <p style={{ fontSize: 12.5, color: '#9ca3af' }}>Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Processing screen ──
  if (step === 'processing' && statusMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FF }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 360 }}>
          <Loader2 style={{ width: 40, height: 40, color: '#5B4FE8', margin: '0 auto 20px', animation: 'spin .7s linear infinite' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{statusMsg}</p>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }



  const inrApprox = Math.round(planCfg.usdPrice * usdToInr);

  const isFormValid = formData.fullName.trim() !== '' &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
                      formData.password.length >= 6 &&
                      formData.password === formData.confirmPassword &&
                      agreed;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: FF }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* ── LEFT: Purple Panel ── */}
      <div style={{
        width: '42%', minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 52px',
        background: 'linear-gradient(145deg, #5B4FE8 0%, #7C6FEF 55%, #9B89F5 100%)',
        position: 'relative', overflow: 'hidden',
      }} className="hidden md:flex">
        {/* blobs */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Free badge */}
          {!isPaid && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9999, padding: '5px 14px', marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Start free · No credit card</span>
            </div>
          )}

          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.18, letterSpacing: '-0.025em', marginBottom: 14 }}>
            {isPaid
              ? <>{planCfg.name} Plan<br /><span style={{ fontSize: 22, fontWeight: 600, opacity: 0.85 }}>One step away from unlimited scraping.</span></>
              : <>Start extracting<br />data in minutes,<br />not weeks.</>
            }
          </h2>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 28, maxWidth: 300 }}>
            {isPaid
              ? `Create your account and pay securely with Razorpay. ≈ ₹${inrApprox.toLocaleString('en-IN')} will be charged.`
              : "Get instant access to Scrapify's full toolkit. Free plan included."
            }
          </p>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 36 }}>
            {(isPaid
              ? planCfg.name === 'Basic'
                ? ['Unlimited scrapes', 'YouTube, Website & Map', 'Excel, PDF & JSON export', 'Priority support', 'AI extraction', 'API access']
                : ['Everything in Basic', 'Unlimited team members', 'Advanced analytics', 'Custom export templates', 'Dedicated account manager', 'SLA guarantee']
              : ['50,000+ daily scrapes included', 'AI-powered page adaptation', 'Export to JSON, CSV, API', 'Cancel anytime']
            ).map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 style={{ width: 17, height: 17, color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)' }}>{f}</span>
              </li>
            ))}
          </ul>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 24 }} />

          {/* Testimonial */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700,
            }}>MR</div>
            <div>
              <p style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 2 }}>Marcus Rivera</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>CTO, Dataflow Inc</p>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontStyle: 'italic' }}>
                "Setup took 10 minutes. We replaced a whole scraping team."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px 0' }}>
          <Link to="/">
            <img src="/scrapify.png" alt="Scrapify" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          </Link>
          <p style={{ fontSize: 13.5, color: '#6b7280', fontWeight: 400 }}>
            Have an account?{' '}
            <Link to="/login" style={{ color: '#5B4FE8', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em', marginBottom: 6, lineHeight: 1.2 }}>
              Create your account
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 22, fontWeight: 400 }}>
              {isPaid ? 'Sign up to complete your purchase.' : 'Start scraping smarter today. Free plan included.'}
            </p>

            {/* Paid plan badge */}
            {isPaid && (
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e0e7ff', background: '#eef2ff' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#5B4FE8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{planCfg.name} Plan</p>
                  <p style={{ fontSize: 11.5, color: '#6366f1' }}>≈ ₹{inrApprox.toLocaleString('en-IN')} will be charged (live rate)</p>
                </div>
              </div>
            )}

            {errors.submit && (
              <div style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                ⚠️ {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Full name */}
              <InputField
                label="Full name" id="fullName" value={formData.fullName}
                placeholder="Jane Doe" error={errors.fullName}
                icon={<User style={{ width: 15, height: 15 }} />}
                onChange={v => { setFormData({ ...formData, fullName: v }); if (errors.fullName) setErrors({ ...errors, fullName: '' }); }}
              />

              {/* Email */}
              <InputField
                label="Email address" id="email" type="email" value={formData.email}
                placeholder="you@company.com" error={errors.email}
                icon={<Mail style={{ width: 15, height: 15 }} />}
                onChange={v => { setFormData({ ...formData, email: v }); if (errors.email) setErrors({ ...errors, email: '' }); }}
              />

              {/* Password */}
              <InputField
                label="Password" id="password" type={showPassword ? 'text' : 'password'}
                value={formData.password} placeholder="At least 8 characters" error={errors.password}
                icon={<Lock style={{ width: 15, height: 15 }} />}
                rightEl={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                }
                onChange={v => { setFormData({ ...formData, password: v }); if (errors.password) setErrors({ ...errors, password: '' }); }}
              />

              {/* Confirm password */}
              <InputField
                label="Confirm password" id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword} placeholder="Re-enter password" error={errors.confirmPassword}
                icon={<Lock style={{ width: 15, height: 15 }} />}
                rightEl={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                    {showConfirm ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                }
                onChange={v => { setFormData({ ...formData, confirmPassword: v }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
              />

              {/* Terms checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#5B4FE8', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <a href="#" style={{ color: '#5B4FE8', textDecoration: 'none', fontWeight: 500 }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" style={{ color: '#5B4FE8', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
                </span>
              </label>

              {/* Submit */}
              <button type="submit" disabled={loading || step === 'processing'}
                style={{
                  width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                  cursor: (loading || step === 'processing') ? 'not-allowed' : 'pointer',
                  fontSize: 14.5, fontWeight: 600, color: '#fff', fontFamily: FF,
                  background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: (loading || step === 'processing') ? 0.65 : 1,
                  transition: 'opacity .15s, transform .15s, box-shadow .2s',
                  boxShadow: '0 4px 16px rgba(91,79,232,.35)',
                  marginTop: 4,
                }}
                onMouseOver={e => { if (!loading && step !== 'processing') { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(91,79,232,.45)'; } }}
                onMouseOut={e => { e.currentTarget.style.opacity = (loading || step === 'processing') ? '0.65' : '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,79,232,.35)'; }}
              >
                {loading
                  ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin .7s linear infinite' }} /> {statusMsg || 'Please wait…'}</>
                  : isPaid
                    ? <><Lock style={{ width: 15, height: 15 }} /> Create account & Pay →</>
                    : <>Create account →</>
                }
              </button>
            </form>

            {isPaid && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#9ca3af', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Lock style={{ width: 11, height: 11 }} /> Secured by Razorpay · 256-bit SSL
              </p>
            )}

            <p style={{ marginTop: 16, fontSize: 13.5, color: '#6b7280', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#5B4FE8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', padding: '0 0 20px' }}>© 2026 Scrapify · All rights reserved</p>
      </div>

    </div>
  );
}
