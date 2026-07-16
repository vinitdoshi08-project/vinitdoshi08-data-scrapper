import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel, planBadgeClass } from '../contexts/SubscriptionContext';
import { ProfileModal } from '../components/ProfileModal';
import {
  Youtube, Globe, Map, LogOut, Settings, ArrowRight, X,
  Edit2, Check, Loader2, LayoutDashboard, User, Bell,
  Plus, Crown, AlertTriangle, RefreshCw, ShieldCheck,
  CheckCircle2, Lock, Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UPGRADE_PLANS = [
  {
    id: 'basic' as const, name: 'Basic',
    monthly: { usd: 6,  label: '$6'  },
    yearly:  { usd: 5,  label: '$5', total: '$60/yr'  },
    features: ['Unlimited scrapes', 'YouTube & Website scraper', 'Excel, PDF & JSON', 'Priority support', 'AI extraction'],
    highlight: true,
  },
  {
    id: 'standard' as const, name: 'Standard',
    monthly: { usd: 9, label: '$9' },
    yearly:  { usd: 8,  label: '$8', total: '$96/yr' },
    features: ['Everything in Basic', 'Unlimited team members', 'Advanced analytics', 'Custom exports', 'SLA guarantee'],
    highlight: false,
  },
];

async function fetchUsdToInrRate(): Promise<number> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    const rate = d?.rates?.INR;
    return rate && rate > 0 ? rate : 84;
  } catch { return 84; }
}

function loadRzpScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

const recentScrapes = [
  { name: 'accountants in London, UK',   source: 'Website', status: 'completed', rows: 142,  when: '2h ago'   },
  { name: 'Marques Brownlee — Playlist', source: 'YouTube', status: 'completed', rows: 387,  when: '5h ago'   },
  { name: 'marketing agencies NYC',       source: 'Website', status: 'running',   rows: 24,   when: 'Just now' },
  { name: 'Lex Fridman Podcast',          source: 'YouTube', status: 'completed', rows: 412,  when: '1d ago'   },
  { name: 'real estate brokers Miami',    source: 'Website', status: 'failed',    rows: 0,    when: '2d ago'   },
];

function ScrapeBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    running:   'bg-indigo-50  text-indigo-600  border-indigo-200',
    failed:    'bg-red-50     text-red-500     border-red-200',
  };
  const dots: Record<string, string> = {
    completed: 'bg-emerald-500', running: 'bg-indigo-500', failed: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] ?? ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? 'bg-gray-300'}`} />
      {status}
    </span>
  );
}

/* ── Subscription info card ── */
function SubscriptionCard({ plan, can_scrape, trial_ends_at, expires_at, billing_cycle, onUpgrade }: {
  plan: string; can_scrape: boolean;
  trial_ends_at: string | null; expires_at?: string | null;
  billing_cycle?: string; onUpgrade: () => void;
}) {
  const isExpired = !can_scrape;
  const isPaid    = plan === 'basic' || plan === 'standard';

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  function daysLeft(iso: string | null | undefined): number {
    if (!iso) return 0;
    try { return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)); }
    catch { return 0; }
  }

  const expiryDate  = isPaid ? expires_at : trial_ends_at;
  const remaining   = daysLeft(expiryDate);
  const statusColor = isExpired
    ? 'text-red-600 bg-red-50 border-red-200'
    : isPaid
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : remaining <= 1
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-emerald-600 bg-emerald-50 border-emerald-200';
  const statusText = isExpired ? 'Expired' : 'Active';

  const cardBg = isExpired
    ? 'linear-gradient(135deg, #fff5f5 0%, #fff 60%, #fef2f2 100%)'
    : isPaid
      ? 'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #f0fdf4 100%)'
      : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 60%, #fef9f0 100%)';

  return (
    <div className={`rounded-2xl border p-6 md:p-7 ${isExpired ? 'border-red-200' : isPaid ? 'border-indigo-100' : 'border-amber-100'}`}
      style={{ background: cardBg, boxShadow: isExpired ? '0 4px 24px rgba(239,68,68,0.08)' : '0 4px 24px rgba(91,79,232,0.08)' }}>

      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isPaid ? 'bg-indigo-600' : isExpired ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isPaid ? <Crown className="w-6 h-6 text-white" /> : isExpired ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <ShieldCheck className="w-6 h-6 text-amber-600" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: isPaid ? '#6366f1' : isExpired ? '#ef4444' : '#d97706' }}>Subscription</p>
            <p className="text-xl font-extrabold text-gray-900">{planLabel(plan as any)}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusColor}`}>{statusText}</span>
      </div>

      {/* Info grid — 4 tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Plan',          value: planLabel(plan as any),                                              valueClass: 'text-gray-900' },
          { label: 'Billing Cycle', value: isPaid ? (billing_cycle === 'yearly' ? 'Yearly' : 'Monthly') : '3-Day Trial', valueClass: 'text-gray-900' },
          { label: 'Status',        value: statusText,                                                          valueClass: isExpired ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Expiry Date',   value: fmtDate(expiryDate),                                                valueClass: isExpired ? 'text-red-600' : 'text-gray-900' },
        ].map(item => (
          <div key={item.label} className="bg-white/70 backdrop-blur-sm rounded-xl p-3.5 border border-white/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{item.label}</p>
            <p className={`text-sm font-bold ${item.valueClass}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Time remaining bar */}
      {!isExpired && expiryDate && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-medium">Time remaining</span>
            <span className="font-bold text-indigo-600">{remaining} day{remaining !== 1 ? 's' : ''} left</span>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white shadow-inner">
            <div
              className={`h-full rounded-full transition-all ${remaining <= 1 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
              style={{ width: `${Math.min(100, (remaining / (billing_cycle === 'yearly' ? 365 : isPaid ? 30 : 3)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Action footer */}
      {isExpired ? (
        <button onClick={onUpgrade}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
          <RefreshCw className="w-4 h-4" /> Renew / Upgrade Plan
        </button>
      ) : !isPaid ? (
        <button onClick={onUpgrade}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
          <Crown className="w-4 h-4" /> Upgrade to a Paid Plan
        </button>
      ) : (
        <div className="inline-flex items-center gap-2 text-sm text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Plan active until {fmtDate(expiryDate)}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user, signOut, updateProfile } = useAuth();
  const { plan, can_scrape, trial_ends_at, loading: subLoading, billing_cycle, freshLoaded, refresh } = useSubscription() as any;
  const expires_at = (useSubscription() as any).expires_at ?? null;
  const navigate   = useNavigate();
  const location   = useLocation();

  const [avatarError,       setAvatarError]       = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings,      setShowSettings]       = useState(false);
  const [isEditingProfile,  setIsEditingProfile]   = useState(false);
  const [editName,  setEditName]  = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email     || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdating,   setIsUpdating]   = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Upgrade modal state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [paying,      setPaying]      = useState<string | null>(null);
  const [upgradeMsg,  setUpgradeMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [usdToInr,    setUsdToInr]    = useState<number>(84);
  const [yearlyBilling, setYearlyBilling] = useState(false);

  useEffect(() => { fetchUsdToInrRate().then(setUsdToInr); }, []);

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;

  useEffect(() => {
    if (user) { setEditName(user.full_name || ''); setEditEmail(user.email || ''); }
  }, [user]);

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(''); setIsUpdating(true);
    try {
      if (updateProfile) { await updateProfile(editName, editEmail); setIsEditingProfile(false); }
    } catch (err: any) { setProfileError(err.message || 'Failed to update profile'); }
    finally { setIsUpdating(false); }
  }

  async function handleLogOut() {
    try { await signOut(); navigate('/login'); } catch {}
  }

  async function handlePay(p: typeof UPGRADE_PLANS[0]) {
    // yearly charges full year amount, monthly charges 1 month
    const usdPrice = yearlyBilling ? p.yearly.usd * 12 : p.monthly.usd;
    const billingLabel = yearlyBilling ? `${p.yearly.total}` : `${p.monthly.label}/mo`;
    setUpgradeMsg(null);
    setPaying(p.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setUpgradeMsg({ type: 'error', text: 'Please log in first.' }); return; }

      const API_URL = import.meta.env.VITE_API_URL as string;
      const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

      const rate        = await fetchUsdToInrRate();
      const amountPaise = Math.round(usdPrice * rate * 100);

      await loadRzpScript();

      const orderRes = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
      });
      if (!orderRes.ok) throw new Error('Could not create order. Try again.');
      const { order_id, amount, currency } = await orderRes.json();

      await new Promise<void>((resolve) => {
        const rzp = new (window as any).Razorpay({
          key: RZP_KEY, amount, currency,
          name: 'Scrapify',
          description: `${p.name} Plan — ${billingLabel}`,
          image: '/scrapify.png', order_id,
          theme: { color: '#5B4FE8' },
          prefill: { email: user?.email ?? '', name: user?.full_name ?? '' },

          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              const vRes = await fetch(`${API_URL}/api/verify-payment`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              if (!vRes.ok) throw new Error('Payment verification failed.');

              const sRes = await fetch(`${API_URL}/api/save-subscription`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token, plan: p.id,
                  billing_cycle:       yearlyBilling ? 'yearly' : 'monthly',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  amount:              usdPrice * 100,
                  currency:            'USD',
                }),
              });
              if (!sRes.ok) throw new Error('Plan activation failed. Contact support.');

              await refresh();
              setUpgradeMsg({ type: 'success', text: `🎉 You're now on the ${p.name} plan! Everything is unlocked.` });
              setTimeout(() => { setShowUpgrade(false); setUpgradeMsg(null); }, 2800);
            } catch (e: any) {
              setUpgradeMsg({ type: 'error', text: e.message });
            }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', (resp: any) => {
          setUpgradeMsg({ type: 'error', text: resp.error?.description ?? 'Payment failed.' });
          resolve();
        });
        rzp.open();
      });
    } catch (e: any) {
      setUpgradeMsg({ type: 'error', text: e.message ?? 'Something went wrong.' });
    } finally {
      setPaying(null);
    }
  }

  const navItems = [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard',       iColor: 'text-indigo-500'  },
    { label: 'YouTube Scraper', icon: Youtube,          path: '/youtube-scraper', iColor: 'text-red-400'     },
    { label: 'Website Scraper', icon: Globe,            path: '/website-scraper', iColor: 'text-emerald-500' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', background: 'linear-gradient(135deg, #f0f4ff 0%, #f8faff 45%, #f0fdf8 100%)' }}>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0 ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
        style={{ boxShadow: '2px 0 20px rgba(0,0,0,0.035)' }}>

        {/* Logo */}
        <div className={`flex items-center h-[72px] shrink-0 border-b border-gray-200 ${sidebarCollapsed ? 'justify-center px-3' : 'px-5'}`}>
          {sidebarCollapsed
            ? <img src="/scrapify.png" alt="S" className="h-10 w-10 object-contain" />
            : <img src="/scrapify.png" alt="Scrapify" className="h-[52px] w-auto object-contain max-w-[200px]" />}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-6 pb-2 space-y-6">

          {/* Workspace section */}
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.18em] px-2 mb-2">
                Workspace
              </p>
            )}
            <div className="space-y-1">
              {navItems.map(item => {
                const active  = location.pathname === item.path;
                const locked  = isExpired && item.path !== '/dashboard';
                const Icon    = item.icon;
                return (
                  <button key={item.path}
                    onClick={() => { if (locked) { setShowUpgrade(true); } else { navigate(item.path); } }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center h-10 rounded-xl text-[13px] font-semibold transition-all duration-150
                      ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'}
                      ${active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : locked
                          ? 'text-gray-300 cursor-pointer opacity-50 hover:opacity-70'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : locked ? 'text-gray-300' : item.iColor}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate leading-none flex-1 text-left">{item.label}</span>
                    )}
                    {!sidebarCollapsed && locked && (
                      <Lock className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account section */}
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.18em] px-2 mb-2">
                Account
              </p>
            )}
            <div className="space-y-1">
              {[
                { label: 'Profile',  icon: User,     iColor: 'text-indigo-400' },
                { label: 'Settings', icon: Settings, iColor: 'text-gray-400'   },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => { setShowSettings(true); setIsEditingProfile(false); }}
                    className={`w-full flex items-center h-10 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150
                      ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'}`}>
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${item.iColor}`} />
                    {!sidebarCollapsed && <span className="leading-none">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Plan chip */}
        {!sidebarCollapsed && (
          <div className={`mx-3 mb-3 rounded-2xl px-4 py-3.5 border ${subLoading ? 'bg-gray-50 border-gray-100' : isPaid ? 'bg-gradient-to-br from-indigo-50 to-indigo-50/50 border-indigo-100' : 'bg-gradient-to-br from-amber-50 to-amber-50/50 border-amber-100'}`}>
            {subLoading ? (
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPaid ? 'bg-indigo-600' : 'bg-amber-500'}`}>
                      <Crown className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className={`text-[13px] font-bold ${isPaid ? 'text-indigo-800' : 'text-amber-800'}`}>
                      {planLabel(plan as any)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isExpired ? 'bg-red-100 text-red-600'
                    : isPaid ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'}`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
                {(!isPaid || isExpired) && !subLoading && (
                  <button onClick={() => setShowUpgrade(true)}
                    className="w-full mt-3 text-[11px] font-bold text-white py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#4F46E5,#6D5FE8)' }}>
                    {isExpired ? 'Renew Plan' : 'Upgrade Plan'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 transition-colors shrink-0 select-none text-lg font-light">
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-[72px] bg-white border-b border-gray-200 flex items-center px-8 shrink-0">

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-gray-900 leading-none">
              {navItems.find(n => n.path === location.pathname)?.label ?? 'Dashboard'}
            </h2>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Plan badge — skeleton while loading */}
            {subLoading
              ? <span className="hidden sm:inline-flex w-16 h-6 rounded-lg bg-gray-100 animate-pulse" />
              : <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${planBadgeClass(plan as any)}`}>
                  <Crown className="w-3 h-3" />{planLabel(plan as any)}
                </span>
            }

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200" />

            {/* Profile */}
            <button onClick={() => { setShowSettings(true); setIsEditingProfile(false); }}
              className="flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
              <div className="w-[32px] h-[32px] rounded-full shrink-0 overflow-hidden ring-2 ring-indigo-100 flex items-center justify-center text-white text-[13px] font-bold"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                {userInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-semibold text-gray-800 leading-none">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-gray-400 leading-none mt-1 truncate max-w-[120px]">{user?.email?.split('@')[0] || ''}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Welcome row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName} 👋</h1>
              <p className="text-sm text-gray-500 mt-0.5">Here's an overview of your account and scrapers.</p>
            </div>
            <button onClick={() => navigate('/youtube-scraper')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
              <Plus className="w-4 h-4" /> New scrape
            </button>
          </div>

          {/* ── Subscription Card ── */}
          {subLoading ? (
            <div className="rounded-2xl border border-gray-100 p-6 animate-pulse bg-gray-50 h-20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
              <div className="h-6 w-14 bg-gray-200 rounded-full" />
            </div>
          ) : (
            <SubscriptionCard
              plan={plan}
              can_scrape={can_scrape}
              trial_ends_at={trial_ends_at}
              expires_at={expires_at}
              billing_cycle={billing_cycle}
              onUpgrade={() => setShowUpgrade(true)}
            />
          )}

          {/* Quick start scrapers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Quick start</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose a scraper to begin extracting data.</p>
              </div>
              {isExpired && (
                <button onClick={() => setShowUpgrade(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                  <Sparkles className="w-3 h-3" /> Unlock all scrapers
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* YouTube Scraper card */}
              <div
                onClick={() => isExpired ? setShowUpgrade(true) : navigate('/youtube-scraper')}
                className={`relative bg-white rounded-2xl border border-gray-100 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-red-100 ${isExpired ? 'cursor-pointer opacity-50 grayscale' : 'cursor-pointer'}`}
                style={{ boxShadow: '0 2px 8px rgba(30,27,75,0.06)' }}>
                <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
                      <Youtube className="w-6 h-6 text-red-500" />
                    </div>
                    {isExpired
                      ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Locked</span>
                      : <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-500 border border-red-100 uppercase tracking-wide">Active</span>
                    }
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-1 leading-snug">YouTube Scraper</h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">Extract videos, channel data, playlists and engagement metrics.</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {['Videos', 'Channels', 'Playlists'].map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-500">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-400">Export: XLSX · PDF · JSON</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500 group-hover:gap-2.5 transition-all">
                      {isExpired ? 'Upgrade' : 'Launch'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Website Scraper card */}
              <div
                onClick={() => isExpired ? setShowUpgrade(true) : navigate('/website-scraper')}
                className={`relative bg-white rounded-2xl border border-gray-100 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-100 ${isExpired ? 'cursor-pointer opacity-50 grayscale' : 'cursor-pointer'}`}
                style={{ boxShadow: '0 2px 8px rgba(30,27,75,0.06)' }}>
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
                      <Globe className="w-6 h-6 text-emerald-500" />
                    </div>
                    {isExpired
                      ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 uppercase tracking-wide flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Locked</span>
                      : <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">Active</span>
                    }
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 mb-1 leading-snug">Website Scraper</h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">AI-powered B2B lead extractor — finds contacts, emails & LinkedIn.</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {['Emails', 'Contacts', 'LinkedIn'].map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-500">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-400">Export: CSV · Excel</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 group-hover:gap-2.5 transition-all">
                      {isExpired ? 'Upgrade' : 'Launch'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Map Scraper — coming soon */}
              <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-default opacity-70"
                style={{ boxShadow: '0 2px 8px rgba(30,27,75,0.04)' }}>
                <div className="h-1 w-full bg-gradient-to-r from-violet-300 to-purple-300" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center ring-1 ring-purple-100">
                      <Map className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-400 border border-purple-100 uppercase tracking-wide">Soon</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-400 mb-1 leading-snug">Map Scraper</h3>
                  <p className="text-xs text-gray-300 mb-5 leading-relaxed">Extract business listings, reviews and location data from maps.</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {['Listings', 'Reviews', 'Locations'].map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-300">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-300">Coming soon</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-300">
                      Launch <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Recent scrapes */}
          <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(30,27,75,0.05)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Recent scrapes</h2>
                <p className="text-xs text-gray-400 mt-0.5">Last 5 jobs across all scrapers</p>
              </div>
              <button className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['Name','Source','Status','Rows','When'].map((h, i) => (
                      <th key={h} className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-3 ${i === 0 ? 'px-6 text-left' : i >= 3 ? 'px-4 text-right' : 'px-4 text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentScrapes.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900 max-w-[200px] truncate">{row.name}</td>
                      <td className="px-4 py-3.5 text-gray-500">{row.source}</td>
                      <td className="px-4 py-3.5"><ScrapeBadge status={row.status} /></td>
                      <td className="px-4 py-3.5 text-right text-gray-700 font-semibold">{row.rows}</td>
                      <td className="px-6 py-3.5 text-right text-gray-400 text-xs">{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ══ UPGRADE MODAL ══ */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: 'rgba(17,24,39,0.6)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(91,79,232,.28)' }}>

            {/* Header */}
            <div className="px-8 pt-7 pb-5 text-center border-b border-gray-100 relative"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#fff)' }}>
              <button onClick={() => { setShowUpgrade(false); setUpgradeMsg(null); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all hover:rotate-90 duration-200">
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)', boxShadow: '0 8px 24px rgba(91,79,232,.35)' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {isExpired ? 'Renew your plan' : 'Upgrade your plan'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">Unlock unlimited scraping. Pay securely via Razorpay.</p>
              
              <div className="flex items-center justify-center gap-3">
                <span className={`text-sm font-semibold transition-colors ${!yearlyBilling ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
                <button 
                  onClick={() => setYearlyBilling(!yearlyBilling)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: yearlyBilling ? '#5B4FE8' : '#e5e7eb' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${yearlyBilling ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                <span className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${yearlyBilling ? 'text-gray-900' : 'text-gray-400'}`}>
                  Yearly <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold tracking-wider">Save 16%</span>
                </span>
              </div>
            </div>

            {upgradeMsg && (
              <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
                upgradeMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {upgradeMsg.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {upgradeMsg.text}
              </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-2 gap-4 p-6">
              {UPGRADE_PLANS.map(p => {
                const totalUsdPrice = yearlyBilling ? p.yearly.usd * 12 : p.monthly.usd;
                const inrEquiv = Math.round(totalUsdPrice * usdToInr);
                const usdLabel = yearlyBilling ? p.yearly.label : p.monthly.label;
                const payButtonLabel = yearlyBilling ? p.yearly.total : p.monthly.label;
                
                return (
                  <div key={p.id}
                    className={`rounded-xl border p-5 flex flex-col relative ${p.highlight ? 'border-indigo-400 shadow-lg' : 'border-gray-200'}`}
                    style={p.highlight ? { background: 'linear-gradient(180deg,#faf9ff,#f0eeff)' } : {}}>
                    {p.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-3 py-1 rounded-full whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                        ⭐ Recommended
                      </span>
                    )}
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 mt-2">{p.name}</p>
                    <div className="flex items-end gap-1 mb-0.5">
                      <p className="text-3xl font-bold text-gray-900 leading-none">{usdLabel}</p>
                      <span className="text-sm font-normal text-gray-400 mb-0.5">/mo</span>
                    </div>
                    <p className="text-xs text-indigo-400 font-semibold mb-4">≈ ₹{inrEquiv.toLocaleString('en-IN')} {yearlyBilling ? 'charged yearly' : 'charged'}</p>
                    <ul className="space-y-1.5 text-xs text-gray-600 mb-5 flex-1">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => handlePay(p)} disabled={!!paying}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)', boxShadow: p.highlight ? '0 4px 16px rgba(91,79,232,.38)' : 'none' }}>
                      {paying === p.id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        : <>Pay {payButtonLabel} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-6 pb-5 text-center">
              <p className="text-xs text-gray-400">🔒 Secured by Razorpay · 256-bit SSL encryption</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOGOUT CONFIRM ══ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowLogoutConfirm(false)} className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full text-gray-500">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Logout</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleLogOut}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">Yes, Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PROFILE MODAL ══ */}
      {showSettings && (
        <ProfileModal onClose={() => { setShowSettings(false); }} />
      )}
    </div>
  );
}
