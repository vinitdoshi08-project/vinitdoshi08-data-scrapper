import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, CheckCircle2, CreditCard, Lock } from 'lucide-react';

const API_URL    = import.meta.env.VITE_API_URL as string;
const RZP_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

// Plan config — prices in USD; Razorpay charges INR converted at live rate
const PLAN_CONFIG = {
  free:    { name: 'Free Forever', usdPrice: 0,   days: 3,   yearly: false },
  basic_m: { name: 'Basic',        usdPrice: 6,   days: 30,  yearly: false }, // $6/mo
  basic_y: { name: 'Basic',        usdPrice: 60,  days: 365, yearly: true  }, // $60/yr ($5/mo)
  std_m:   { name: 'Standard',     usdPrice: 10,  days: 30,  yearly: false }, // $10/mo
  std_y:   { name: 'Standard',     usdPrice: 108, days: 365, yearly: true  }, // $108/yr ($9/mo)
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

export function Signup() {
  const navigate         = useNavigate();
  const [params]         = useSearchParams();
  const { signup }       = useAuth();

  // Plan intent from URL: ?plan=basic_m, ?plan=std_y, etc.
  const planKey = (params.get('plan') as PlanKey) || 'free';
  const planCfg = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.free;
  const isPaid  = planKey !== 'free';

  const [step, setStep]             = useState<'form' | 'processing' | 'done'>('form');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [formData, setFormData]     = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors,   setErrors]       = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg]   = useState('');

  // Live USD→INR rate for display and payment
  const [usdToInr, setUsdToInr] = useState<number>(84);
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.INR) setUsdToInr(d.rates.INR); })
      .catch(() => {});
  }, []);

  /** USD dollars → INR paise for Razorpay */
  function usdToPaise(usdDollars: number): number {
    return Math.round(usdDollars * usdToInr * 100);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim())  e.fullName = 'Full name is required';
    if (!formData.email.trim())     e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email address';
    if (formData.password.length < 6)                      e.password = 'At least 6 characters';
    if (formData.password !== formData.confirmPassword)    e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      // ── Step 1: Create Supabase account ──────────────────────
      setStatusMsg('Creating your account…');
      await signup(formData.fullName, formData.email, formData.password);

      if (!isPaid) {
        // Free plan — activate immediately and redirect
        setStep('done');
        setTimeout(() => navigate('/dashboard'), 1800);
        return;
      }

      // ── Step 2: Paid plan — sign in to get session token ──────
      setStep('processing');
      setStatusMsg('Account created! Signing you in…');

      // Explicitly sign in after signup to get a valid session
      const { supabase } = await import('../lib/supabase');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email:    formData.email,
        password: formData.password,
      });

      if (signInError || !signInData.session) {
        throw new Error('Account created but sign-in failed. Please log in manually to complete payment.');
      }

      const token = signInData.session.access_token;

      // ── Step 3: Load Razorpay ─────────────────────────────────
      setStatusMsg('Loading payment gateway…');
      await loadRazorpayScript();

      // ── Step 4: Create order on backend — charge INR (converted from USD at live rate) ──
      const usdDollars  = planCfg.usdPrice;
      const amountPaise = usdToPaise(usdDollars); // USD × live rate × 100 = paise
      setStatusMsg('Creating payment order…');
      const orderRes = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:   amountPaise,   // INR paise for Razorpay
          currency: 'INR',
          receipt:  `rcpt_${planKey}_${Date.now()}`,
        }),
      });
      if (!orderRes.ok) {
        const e = await orderRes.json().catch(() => ({}));
        throw new Error(e.detail ?? 'Failed to create payment order. Try again.');
      }
      const { order_id, amount, currency } = await orderRes.json();

      // ── Step 5: Open Razorpay modal ───────────────────────────
      setStatusMsg('');
      await new Promise<void>((resolve, reject) => {
        const options = {
          key:         RZP_KEY_ID,
          amount, currency,
          name:        'Scrapify',
          description: `${planCfg.name} Plan`,
          image:       '/scrapify.png',
          order_id,
          theme:       { color: '#5B4FE8' },
          prefill:     { email: formData.email, name: formData.fullName },

          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            try {
              setStatusMsg('Verifying payment…');

              // ── Step 6: Verify signature on backend ──────────
              const vRes = await fetch(`${API_URL}/api/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              if (!vRes.ok) {
                const e = await vRes.json().catch(() => ({}));
                throw new Error(e.detail ?? 'Payment verification failed. Contact support.');
              }

              // ── Step 7: Activate subscription on backend ──────
              setStatusMsg('Activating your plan…');
              const planName = planCfg.name.toLowerCase() as 'basic' | 'standard';
              const sRes = await fetch(`${API_URL}/api/save-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  plan:                planName,
                  billing_cycle:       planCfg.yearly ? 'yearly' : 'monthly',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  amount:              usdDollars * 100,  // store as cents: $6 → 600
                  currency:            'USD',
                }),
              });
              if (!sRes.ok) {
                const e = await sRes.json().catch(() => ({}));
                throw new Error(e.detail ?? 'Plan activation failed. Contact support with ID: ' + response.razorpay_payment_id);
              }

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

  // ── Success screen ────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-10 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPaid ? '🎉 Plan activated!' : 'Account created!'}
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            {isPaid
              ? `Your ${planCfg.name} plan is now active.`
              : 'Your 3-day free trial has started.'}
          </p>
          <p className="text-gray-400 text-xs">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Processing screen ─────────────────────────────────────────
  if (step === 'processing' && statusMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-10 max-w-sm">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-5" />
          <p className="text-gray-700 font-semibold">{statusMsg}</p>
        </div>
      </div>
    );
  }

  // ── Plan indicator badge ──────────────────────────────────────
  function PlanBadge() {
    if (!isPaid) return null;
    const usdLabels: Record<PlanKey, string> = {
      free: '', basic_m: '$6/mo', basic_y: '$5/mo (billed yearly)',
      std_m: '$10/mo', std_y: '$9/mo (billed yearly)',
    };
    const inrApprox = Math.round(planCfg.usdPrice * usdToInr);
    return (
      <div className="mb-6 flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-700">{planCfg.name} Plan — {usdLabels[planKey]}</p>
          <p className="text-xs text-indigo-500">≈ ₹{inrApprox.toLocaleString('en-IN')} will be charged (live rate)</p>
        </div>
      </div>
    );
  }

  // ── Main signup form ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* LEFT: Form */}
      <div className="flex flex-col w-full md:w-1/2 px-8 md:px-16 py-10">
        <Link to="/" className="flex items-center mb-10">
          <img src="/scrapify.png" alt="Scrapify" className="h-16 w-auto object-contain" />
        </Link>

        <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            {isPaid ? 'Sign up to complete your purchase.' : 'Start your 3-day free trial. No credit card required.'}
          </p>

          <PlanBadge />

          {errors.submit && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input type="text" value={formData.fullName} placeholder="John Doe"
                onChange={e => { setFormData({ ...formData, fullName: e.target.value }); if (errors.fullName) setErrors({ ...errors, fullName: '' }); }}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" value={formData.email} placeholder="you@example.com"
                onChange={e => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={formData.password} placeholder="At least 6 characters"
                  onChange={e => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }}
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} placeholder="Re-enter password"
                  onChange={e => { setFormData({ ...formData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
                  className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || step === 'processing'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {statusMsg || 'Please wait…'}</>
              ) : isPaid ? (
                <><Lock className="w-4 h-4" /> Create account &amp; Pay</>
              ) : (
                <>Create account →</>
              )}
            </button>
          </form>

          {isPaid && (
            <p className="mt-4 text-xs text-center text-gray-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Secured by Razorpay · 256-bit SSL
            </p>
          )}

          <p className="mt-4 text-xs text-center text-gray-400">
            By signing up, you agree to our{' '}
            <a href="#" className="underline hover:text-gray-600">Terms</a> and{' '}
            <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
          <p className="mt-4 text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
          </p>
        </div>
        <p className="text-xs text-gray-400 text-center mt-8">© 2026 Scrapify</p>
      </div>

      {/* RIGHT: Plan info panel */}
      <div className="hidden md:flex w-1/2 flex-col justify-center px-16 py-10 text-white"
        style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
        {isPaid ? (
          <>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">{planCfg.name} Plan</h2>
            <p className="text-indigo-200 text-sm leading-relaxed mb-8 max-w-sm">
              You're one step away from unlimited scraping. Create your account and pay securely with Razorpay.
            </p>
            <ul className="space-y-3 text-sm">
              {(planCfg.name === 'Basic'
                ? ['Unlimited scrapes', 'YouTube, Website & Map', 'Excel, PDF & JSON export', 'Priority support', 'AI extraction', 'API access']
                : ['Everything in Basic', 'Unlimited team members', 'Advanced analytics', 'Custom exports', 'Dedicated manager', 'SLA guarantee']
              ).map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-indigo-100">
                  <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">Join 10,000+<br />teams.</h2>
            <p className="text-indigo-200 text-sm leading-relaxed mb-10 max-w-sm">
              From indie founders to enterprise data teams — Scrapify is the modern way to extract data.
            </p>
            <ul className="space-y-3 text-sm">
              {['3-day free trial', 'Unlimited public scrapes', 'Excel, PDF & JSON exports', 'AI-powered with Gemini 2.5', 'Email support included'].map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-indigo-100">
                  <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
