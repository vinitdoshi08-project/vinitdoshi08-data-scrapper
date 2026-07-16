import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Youtube, Globe, Map, Shield, Zap, Download, Bot, CheckCircle2, ChevronDown, ChevronUp, Check, Loader2, X, CreditCard, User, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_URL   = import.meta.env.VITE_API_URL as string;
const RZP_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

const faqs = [
  { q: 'What types of data can I scrape?', a: 'YouTube videos and playlists, any public website, and map services. Each scraper is tuned to its source.' },
  { q: 'Is it secure?', a: 'Yes. We use industry-standard encryption for all credentials, and data is transmitted over HTTPS.' },
  { q: 'How do I create an account?', a: 'Click "Get started" and fill in your name, email, and password. No credit card required.' },
  { q: 'Is scraping legal?', a: 'Scraping publicly available data is generally legal, but always comply with the target site\'s terms of service.' },
  { q: 'Is this free?', a: 'We offer a free plan with a 3-day trial. Premium plans unlock unlimited scrapes.' },
];

function Toast({ msg, onClose }: { msg: { type: 'success' | 'error'; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 7000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium max-w-md w-full mx-4 ${
      msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/** Modal shown after payment — collects email+password to create/login account */
function PostPaymentModal({
  planId, planName, paymentId, orderId, amountPaise,
  onSuccess, onClose,
}: {
  planId: string; planName: string; paymentId: string; orderId: string; amountPaise: number;
  onSuccess: () => void; onClose: () => void;
}) {
  const [mode, setMode]         = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      let userId: string;
      let token: string;

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        if (!data.user) throw new Error('Signup failed — please try logging in instead.');
        userId = data.user.id;
        // Get fresh session token
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? '';
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        userId = data.user.id;
        token  = data.session?.access_token ?? '';
      }

      if (!token) throw new Error('Could not get session token.');

      // Save subscription to backend
      const res = await fetch(`${API_URL}/api/save-subscription`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          plan:                planId,
          razorpay_payment_id: paymentId,
          razorpay_order_id:   orderId,
          amount:              amountPaise,
          currency:            'INR',
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail ?? 'Failed to activate plan. Contact support.');
      }

      onSuccess();
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
          <X className="w-4 h-4" />
        </button>

        {/* Success header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment successful! 🎉</h2>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'signup' ? 'Create your account to activate the' : 'Log in to activate the'}{' '}
            <strong>{planName}</strong> plan.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-gray-200 p-1 mb-5">
          {(['signup', 'login'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'signup' ? 'Create account' : 'Log in'}
            </button>
          ))}
        </div>

        {err && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="John Doe"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white mt-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</> : <><Lock className="w-4 h-4" /> Activate {planName} Plan</>}
          </button>
        </form>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq]       = useState<number | null>(0);
  const [yearly, setYearly]         = useState(false);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [postPayment, setPostPayment] = useState<{
    planId: string; planName: string; paymentId: string; orderId: string; amountInr: number;
  } | null>(null);

  // Live USD → INR rate (fetched once on mount, fallback = 84)
  const [usdToInr, setUsdToInr] = useState<number>(84);
  const [rateLoaded, setRateLoaded] = useState(false);

  useEffect(() => {
    // Free public API — no key needed
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => {
        const rate = d?.rates?.INR;
        if (rate && rate > 0) { setUsdToInr(rate); }
      })
      .catch(() => {/* keep fallback 84 */})
      .finally(() => setRateLoaded(true));
  }, []);

  /** Convert USD dollars to INR paise for Razorpay */
  function usdToPaise(usd: number): number {
    return Math.round(usd * usdToInr * 100); // 1 USD = usdToInr rupees = usdToInr*100 paise
  }

  /** Display string e.g. "$6" with INR equivalent underneath */
  function inrEquiv(usd: number): string {
    const inr = Math.round(usd * usdToInr);
    return `≈ ₹${inr.toLocaleString('en-IN')}`;
  }

  const dismissToast = () => setToast(null);

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).Razorpay !== 'undefined') { resolve(); return; }
      const s = document.createElement('script');
      s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Razorpay. Check your internet connection.'));
      document.body.appendChild(s);
    });
  }

  async function handlePay(planId: 'basic' | 'standard', planName: string, usdAmount: number) {
    // Determine plan key based on planId + yearly toggle
    const planKey = planId === 'basic'
      ? (yearly ? 'basic_y' : 'basic_m')
      : (yearly ? 'std_y'   : 'std_m');

    // Check if already logged in
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      // Already logged in — go directly to payment via TrialGate flow or inline
      // Store plan intent and go to pricing anchor where TrialGate handles upgrade
      sessionStorage.setItem('pending_plan', planKey);
      navigate('/dashboard');
    } else {
      // Not logged in — send to signup with plan intent
      navigate(`/signup?plan=${planKey}`);
    }
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── TOAST ── */}
      {toast && <Toast msg={toast} onClose={dismissToast} />}

      {/* ── POST-PAYMENT SIGNUP/LOGIN MODAL ── */}
      {postPayment && (
        <PostPaymentModal
          planId={postPayment.planId}
          planName={postPayment.planName}
          paymentId={postPayment.paymentId}
          orderId={postPayment.orderId}
          amountPaise={postPayment.amountInr}
          onSuccess={() => {
            setPostPayment(null);
            setToast({ type: 'success', text: `🎉 ${postPayment.planName} plan activated! Redirecting to dashboard…` });
            setTimeout(() => navigate('/dashboard'), 2000);
          }}
          onClose={() => {
            setPostPayment(null);
            setToast({ type: 'error', text: 'Account not linked. Contact support with payment ID: ' + postPayment.paymentId });
          }}
        />
      )}

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/scrapify.png" alt="Scrapify" className="h-20 w-auto object-contain" />
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-500 font-medium">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Log in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-md transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.96 0.05 270 / 0.55), transparent 60%), linear-gradient(180deg, oklch(0.985 0.005 250) 0%, #fff 100%)',
        }}
      >
        <div className="bg-grid absolute inset-0 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-500 font-medium mb-8 shadow-sm">
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            AI-powered data extraction · Now with Gemini 2.5
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.08] mb-4 tracking-tight">
            All-in-one data scraper
            <br />
            <span style={{ color: '#5B4FE8' }}>for modern teams.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Extract structured data from YouTube, websites, and maps in seconds. Secure, fast, and beautifully simple.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-all hover:opacity-90 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold px-6 py-3 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required · Free plan</p>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="border-y border-gray-100 bg-white py-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-7">
            Trusted by data teams at fast-moving companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne'].map(name => (
              <span key={name} className="text-gray-300 font-bold text-lg tracking-tight select-none">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCRAPERS ── */}
      <section id="scrapers" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">Scrapers</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-3">One platform. Every source.</h2>
            <p className="text-gray-500 text-base">Pick a scraper, paste a URL, and ship clean data in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Youtube className="w-5 h-5 text-red-500" />,
                bg: 'bg-red-50',
                title: 'YouTube Scraper',
                desc: 'Extract video data, channel info, and statistics from YouTube videos and playlists.',
                link: '/login',
              },
              {
                icon: <Globe className="w-5 h-5 text-emerald-500" />,
                bg: 'bg-emerald-50',
                title: 'Website Scraper',
                desc: 'Scrape data from any website with advanced parsing and AI-powered extraction.',
                link: '/login',
              },
              {
                icon: <Map className="w-5 h-5 text-indigo-500" />,
                bg: 'bg-indigo-50',
                title: 'Map Scraper',
                desc: 'Extract location data, business info, and reviews from map services.',
                link: '/login',
              },
            ].map(item => (
              <Link
                key={item.title}
                to={item.link}
                className="group rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-all hover:border-indigo-100"
                style={{
                  background: 'linear-gradient(180deg, oklch(100% 0 0) 0%, oklch(98.5% .005 255) 100%)',
                  boxShadow: '0 1px 4px 0 oklch(0.21 0.05 264 / 0.05)',
                }}
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-5`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24" style={{ background: 'oklch(0.985 0.005 250)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-3">From URL to insight in four steps</h2>
            <p className="text-gray-500 text-base">A clean workflow built around your data.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'Sign up', desc: 'Create your free account in seconds. No credit card needed.' },
              { n: '02', title: 'Choose scraper', desc: 'Pick from YouTube, Website, or Map scraper.' },
              { n: '03', title: 'Enter input', desc: 'Paste a URL and configure output options.' },
              { n: '04', title: 'Download data', desc: 'Export to Excel, PDF, or JSON.' },
            ].map(step => (
              <div
                key={step.n}
                className="rounded-2xl border border-gray-100 bg-white p-7"
                style={{ boxShadow: '0 1px 4px 0 oklch(0.21 0.05 264 / 0.05)' }}
              >
                <p className="text-xs font-bold text-indigo-400 mb-3 tracking-wider">{step.n}</p>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">Features</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Everything you need for data extraction</h2>
            <p className="text-gray-500 text-base">Built for analysts, marketers, and engineers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Shield className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50', title: 'Secure authentication', desc: 'Email + password authentication with industry-standard security.' },
              { icon: <Zap className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50', title: 'Fast scraping', desc: 'Optimized algorithms for quick data extraction at scale.' },
              { icon: <Download className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50', title: 'Clean exports', desc: 'Export to Excel, PDF, or JSON ready for analysis.' },
              { icon: <Bot className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50', title: 'AI-powered', desc: 'Gemini-powered extraction adapts to any page structure.' },
              { icon: <Globe className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50', title: 'Any website', desc: 'Crawl, parse, and structure data from any public URL.' },
              { icon: <Map className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50', title: 'Geo-aware', desc: 'Pull business info, reviews, and locations from maps.' },
            ].map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-7"
                style={{ boxShadow: '0 1px 4px 0 oklch(0.21 0.05 264 / 0.05)' }}
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section
        className="py-24"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(96% .05 270 / .6), transparent 60%), linear-gradient(180deg, oklch(99% .005 250) 0%, oklch(100% 0 0) 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'oklch(54% .22 277)' }}>Product</p>
          <h2 className="text-4xl font-bold mb-3" style={{ color: 'oklch(0.21 0.05 264)', letterSpacing: '-0.025em' }}>
            A dashboard worth opening every day
          </h2>
          <p className="text-base mb-14" style={{ color: 'oklch(0.52 0.03 257)' }}>Clean, fast, and built for focus.</p>

          {/* Outer glow wrapper — relative so the blur pseudo sits behind the card */}
          <div className="relative mt-14 max-w-3xl mx-auto">

            {/* Brand gradient glow blob — absolute, behind the card */}
            <div
              className="absolute inset-x-8 -top-8 -bottom-8 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, oklch(54% .22 277) 0%, oklch(66% .21 290) 100%)',
                opacity: 0.2,
                filter: 'blur(64px)',
                borderRadius: '1.5rem',
                zIndex: 0,
              }}
            />

            {/* Browser chrome card */}
            <div
              className="relative overflow-hidden text-left"
              style={{
                zIndex: 1,
                borderRadius: '1rem',
                border: '1px solid oklch(0.93 0.01 255)',
                boxShadow: '0 1px 3px 0 oklch(0.21 0.05 264 / 0.06), 0 1px 2px -1px oklch(0.21 0.05 264 / 0.04)',
                background: '#fff',
              }}
            >
              {/* Window title bar */}
              <div
                className="flex items-center gap-1.5 px-4 py-3"
                style={{ background: 'oklch(0.985 0.005 250)', borderBottom: '1px solid oklch(0.93 0.01 255)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
              </div>

              {/* Dashboard layout */}
              <div className="flex" style={{ minHeight: '240px' }}>

                {/* Sidebar */}
                <div
                  className="shrink-0 flex flex-col gap-0.5 p-3"
                  style={{
                    width: '130px',
                    borderRight: '1px solid oklch(0.93 0.01 255)',
                    background: 'oklch(0.99 0.005 250)',
                  }}
                >
                  {/* Active item — exact --gradient-brand */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, oklch(54% .22 277) 0%, oklch(66% .21 290) 100%)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.6)' }} />
                    Dashboard
                  </div>
                  {[
                    { label: 'YouTube',  dot: '#EF4444' },
                    { label: 'Website',  dot: '#10B981' },
                    { label: 'Profile',  dot: 'oklch(0.72 0.01 257)' },
                    { label: 'Settings', dot: 'oklch(0.72 0.01 257)' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-default"
                      style={{ color: 'oklch(0.52 0.03 257)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.dot }} />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-5" style={{ background: '#fff' }}>

                  {/* KPI row */}
                  <div className="grid grid-cols-4 gap-2.5 mb-4">
                    {[
                      { label: 'Total scrapes', val: '12,438', sub: '+24%',  subStyle: { color: '#10B981' } },
                      { label: 'Active jobs',   val: '8',      sub: 'live',  subStyle: { color: '#3B82F6' } },
                      { label: 'Exports',       val: '3,221',  sub: '+12%',  subStyle: { color: '#10B981' } },
                      { label: 'Success rate',  val: '99.8%',  sub: 'stable',subStyle: { color: '#10B981' } },
                    ].map(s => (
                      <div
                        key={s.label}
                        className="rounded-xl p-3"
                        style={{ border: '1px solid oklch(0.93 0.01 255)', background: '#fff' }}
                      >
                        <p className="text-[9px] font-medium mb-1.5" style={{ color: 'oklch(0.52 0.03 257)' }}>{s.label}</p>
                        <p className="text-base font-bold" style={{ color: 'oklch(0.21 0.05 264)', letterSpacing: '-0.02em' }}>{s.val}</p>
                        <p className="text-[9px] font-semibold mt-0.5" style={s.subStyle}>{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Activity chart area */}
                  <div
                    className="rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      height: '120px',
                      border: '1px solid oklch(0.93 0.01 255)',
                      background: 'oklch(0.985 0.005 250)',
                    }}
                  >
                    <svg width="92%" height="78%" viewBox="0 0 320 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(54% .22 277)" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="oklch(66% .21 290)" stopOpacity="0.45" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60].map(y => (
                        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="oklch(0.93 0.01 255)" strokeWidth="0.8" />
                      ))}
                      {[
                        { x: 8,   h: 48 }, { x: 40,  h: 32 }, { x: 72,  h: 62 }, { x: 104, h: 38 },
                        { x: 136, h: 52 }, { x: 168, h: 26 }, { x: 200, h: 68 }, { x: 232, h: 42 },
                        { x: 264, h: 57 }, { x: 296, h: 72 },
                      ].map((b, i) => (
                        <rect key={i} x={b.x} y={80 - b.h} width="20" height={b.h} rx="3" fill="url(#barGrad2)" />
                      ))}
                    </svg>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">What our customers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: '"Scrapify replaced three internal tools. Our team ships data pipelines in hours, not weeks."', name: 'Sarah Chen', role: 'Head of Data, Northwind', initials: 'SC' },
              { quote: '"The cleanest scraping UX I\'ve ever used. Feels like Linear, works like Stripe."', name: 'Marcus Reyes', role: 'Founder, Aperture', initials: 'MR' },
              { quote: '"Reliable, fast, and the exports just work. Our analysts love it."', name: 'Priya Nair', role: 'Analytics Lead, Tesla', initials: 'PN' },
            ].map(t => (
              <div
                key={t.name}
                className="rounded-2xl border border-gray-100 p-7"
                style={{
                  background: 'linear-gradient(180deg, oklch(100% 0 0) 0%, oklch(98.5% .005 255) 100%)',
                  boxShadow: '0 1px 4px 0 oklch(0.21 0.05 264 / 0.05)',
                }}
              >
                <p className="text-sm text-gray-700 leading-relaxed mb-6">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24" style={{ background: 'oklch(0.985 0.005 250)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">FAQ</p>
            <h2 className="text-4xl font-bold text-gray-900">Frequently asked questions</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-3">Pricing</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-base">Start free. Scale when you're ready.</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${yearly ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${yearly ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly
              <span className="ml-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Save 20%</span>
            </span>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* ── FREE ── */}
            <div 
              onClick={() => navigate('/signup?plan=free')}
              className="rounded-2xl border border-gray-200 bg-white p-8 h-full flex flex-col cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all" 
              style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.06)' }}
            >
              <div className="min-h-[140px]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-sm text-gray-400 mb-1.5">/mo</span>
                </div>
                <p className="text-xs text-amber-500 font-semibold mb-2">3-day trial access</p>
                <p className="text-xs text-transparent select-none mb-4">Spacer</p>
              </div>
              <button
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-gray-50 group-hover:bg-gray-100 transition-all mb-8"
              >
                Get started free
              </button>
              <ul className="space-y-3 text-sm text-gray-600 flex-1">
                {['Up to 50 scrapes', 'YouTube & Website scraper', 'CSV export', 'Community support', '3-day free trial'].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── BASIC — RECOMMENDED ── */}
            <div
              onClick={() => handlePay('basic', 'Basic', yearly ? 5 : 6)}
              className="rounded-2xl border border-gray-200 p-8 relative h-full flex flex-col cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(180deg,#fff 0%,#f8f7ff 100%)', boxShadow: '0 8px 32px -4px rgba(91,79,232,0.18)' }}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="text-xs font-bold text-white px-4 py-1 rounded-full whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>Recommended</span>
              </div>

              <div className="min-h-[140px]">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-4">Basic</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">${yearly ? '5' : '6'}</span>
                  <span className="text-sm text-gray-400 mb-1.5">/mo</span>
                </div>
                {/* Live INR equivalent */}
                <p className="text-xs text-indigo-400 font-semibold mb-1">
                  {rateLoaded ? inrEquiv(yearly ? 5 : 6) + '/mo' : '…'} · charged at live rate
                </p>
                {yearly
                  ? <p className="text-xs text-emerald-500 font-semibold mb-4">Billed $60/yr · Save $12</p>
                  : <p className="text-xs text-gray-400 mb-4">Billed monthly</p>}
              </div>

              <button
                disabled={!!payingPlan}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)', boxShadow: '0 4px 14px rgba(91,79,232,0.35)' }}
              >
                {payingPlan === 'basic' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Get started'}
              </button>

              <ul className="space-y-3 text-sm text-gray-600 flex-1">
                {['Unlimited scrapes', 'YouTube, Website & Map scraper', 'Excel, PDF & JSON export', 'Priority email support', 'AI-powered extraction', 'API access'].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── STANDARD ── */}
            <div 
              onClick={() => handlePay('standard', 'Standard', yearly ? 8 : 9)}
              className="rounded-2xl border border-gray-200 bg-white p-8 h-full flex flex-col cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all" 
              style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.06)' }}
            >
              <div className="min-h-[140px]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Standard</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">${yearly ? '8' : '9'}</span>
                  <span className="text-sm text-gray-400 mb-1.5">/mo</span>
                </div>
                {/* Live INR equivalent */}
                <p className="text-xs text-indigo-400 font-semibold mb-1">
                  {rateLoaded ? inrEquiv(yearly ? 8 : 9) + '/mo' : '…'} · charged at live rate
                </p>
                {yearly
                  ? <p className="text-xs text-emerald-500 font-semibold mb-4">Billed $96/yr · Save $12</p>
                  : <p className="text-xs text-gray-400 mb-4">Billed monthly</p>}
              </div>

              <button
                disabled={!!payingPlan}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 bg-gray-50 group-hover:bg-gray-100 transition-all mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {payingPlan === 'standard' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Get started'}
              </button>

              <ul className="space-y-3 text-sm text-gray-600 flex-1">
                {['Everything in Basic', 'Unlimited team members', 'Advanced analytics', 'Custom export templates', 'Dedicated account manager', 'SLA guarantee', 'White-label exports'].map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 px-6">
        <div
          className="max-w-4xl mx-auto rounded-2xl px-10 py-14 text-center text-white"
          style={{ background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 100%)' }}
        >
          <h2 className="text-3xl font-bold mb-3">Ready to extract data the easy way?</h2>
          <p className="text-indigo-200 mb-8 text-base">Join thousands of teams already scraping smarter with Scrapify.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-indigo-50 transition-all"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-all"
            >
              Sign in
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Free plan</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="border-t border-gray-100 bg-white py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/scrapify.png" alt="Scrapify" className="h-14 w-auto object-contain" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                The professional data extraction platform. Built for modern teams who move fast.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-gray-700 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-700 transition-colors">How it works</a></li>
                <li><a href="#faq" className="hover:text-gray-700 transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="#" className="hover:text-gray-700 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-700 transition-colors">Privacy</a></li>
                <li><a href="mailto:support@scrapify.com" className="hover:text-gray-700 transition-colors">support@scrapify.com</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-400">© 2026 Scrapify. All rights reserved.</p>
            <p className="text-xs text-gray-400">Crafted for data teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

