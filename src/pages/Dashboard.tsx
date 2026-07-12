import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel, planBadgeClass } from '../contexts/SubscriptionContext';
import {
  Youtube, Globe, Map, LogOut, Settings, ArrowRight, X,
  Edit2, Check, Loader2, LayoutDashboard, User, Bell,
  Plus, Crown, AlertTriangle, RefreshCw, ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const { plan, can_scrape, trial_ends_at, loading: subLoading, billing_cycle } = useSubscription() as any;
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
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;

  // Show expired modal automatically once
  useEffect(() => {
    if (isExpired) setShowExpiredModal(true);
  }, [isExpired]);

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
    try { await signOut(); navigate('/'); } catch {}
  }

  const navItems = [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard',       iColor: 'text-indigo-500'  },
    { label: 'YouTube Scraper', icon: Youtube,          path: '/youtube-scraper', iColor: 'text-red-400'     },
    { label: 'Website Scraper', icon: Globe,            path: '/website-scraper', iColor: 'text-emerald-500' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', background: 'linear-gradient(135deg, #f0f4ff 0%, #f8faff 45%, #f0fdf8 100%)' }}>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shrink-0 ${sidebarCollapsed ? 'w-[72px]' : 'w-[252px]'}`}>

        {/* Logo — h-[64px] matches topbar exactly */}
        <div className={`flex items-center h-[64px] shrink-0 border-b border-gray-100 ${sidebarCollapsed ? 'justify-center' : 'px-5'}`}>
          {sidebarCollapsed
            ? <img src="/scrapify.png" alt="S" className="h-9 w-9 object-contain" />
            : <img src="/scrapify.png" alt="Scrapify" className="h-11 w-auto object-contain max-w-[180px]" />}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pt-5 pb-2">

          {/* Workspace label */}
          {!sidebarCollapsed && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] px-2 mb-1.5">
              Workspace
            </p>
          )}

          <div className="space-y-0.5 mb-5">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center h-9 rounded-lg text-[13px] font-medium transition-all duration-150
                    ${sidebarCollapsed ? 'justify-center' : 'gap-2.5 px-2.5'}
                    ${active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <Icon className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-white' : item.iColor}`} />
                  {!sidebarCollapsed && <span className="truncate leading-none">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Account label */}
          {!sidebarCollapsed && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.14em] px-2 mb-1.5">
              Account
            </p>
          )}
          <div className="space-y-0.5">
            {[
              { label: 'Profile',  icon: User,     iColor: 'text-indigo-400' },
              { label: 'Settings', icon: Settings, iColor: 'text-gray-400'   },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button key={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => { setShowSettings(true); setIsEditingProfile(false); }}
                  className={`w-full flex items-center h-9 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150
                    ${sidebarCollapsed ? 'justify-center' : 'gap-2.5 px-2.5'}`}>
                  <Icon className={`w-[17px] h-[17px] shrink-0 ${item.iColor}`} />
                  {!sidebarCollapsed && <span className="leading-none">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Plan chip */}
        {!sidebarCollapsed && (
          <div className={`mx-3 mb-3 rounded-xl px-3.5 py-3 border ${isPaid ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className={`w-3.5 h-3.5 shrink-0 ${isPaid ? 'text-indigo-500' : 'text-amber-500'}`} />
                <span className={`text-xs font-bold ${isPaid ? 'text-indigo-700' : 'text-amber-700'}`}>
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
            {!isPaid && !isExpired && (
              <button onClick={() => navigate('/#pricing')}
                className="w-full mt-2.5 text-[11px] font-bold text-white py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-9 border-t border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 transition-colors shrink-0 select-none text-base">
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar — h-[64px] matches sidebar logo */}
        <header className="h-[64px] bg-white border-b border-gray-200 flex items-center px-6 shrink-0">

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-gray-900 leading-none">
              {navItems.find(n => n.path === location.pathname)?.label ?? 'Dashboard'}
            </h2>
            {/* <p className="text-[11px] text-gray-400 mt-0.5 leading-none">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p> */}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Bell */}
            <button className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-[17px] h-[17px]" />
              <span className="absolute top-2 right-2 w-[5px] h-[5px] bg-red-500 rounded-full ring-1 ring-white" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Plan badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${planBadgeClass(plan as any)}`}>
              <Crown className="w-3 h-3" />{planLabel(plan as any)}
            </span>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Profile */}
            <button onClick={() => { setShowSettings(true); setIsEditingProfile(false); }}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
              <div className="w-[32px] h-[32px] rounded-full shrink-0 overflow-hidden ring-2 ring-indigo-100 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                {avatarError
                  ? userInitials
                  : <img src="/avatar.png" alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-semibold text-gray-800 leading-none">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-gray-400 leading-none mt-0.5 truncate max-w-[100px]">{user?.email?.split('@')[0] || ''}</p>
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

          {/* ── Subscription Card — full width, gradient background ── */}
          <SubscriptionCard
            plan={plan}
            can_scrape={can_scrape}
            trial_ends_at={trial_ends_at}
            expires_at={expires_at}
            billing_cycle={billing_cycle}
            onUpgrade={() => navigate('/#pricing')}
          />

          {/* Quick start scrapers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Quick start</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose a scraper to begin extracting data.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* YouTube Scraper card */}
              <div onClick={() => navigate('/youtube-scraper')}
                className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-red-100"
                style={{ boxShadow: '0 2px 8px rgba(30,27,75,0.06)' }}>
                {/* Accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
                <div className="p-6">
                  {/* Icon + badge row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center ring-1 ring-red-100">
                      <Youtube className="w-6 h-6 text-red-500" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-500 border border-red-100 uppercase tracking-wide">Active</span>
                  </div>
                  {/* Title & desc */}
                  <h3 className="text-[15px] font-bold text-gray-900 mb-1 leading-snug">YouTube Scraper</h3>
                  <p className="text-xs text-gray-400 mb-5 leading-relaxed">Extract videos, channel data, playlists and engagement metrics.</p>
                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {['Videos', 'Channels', 'Playlists'].map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-gray-500">{tag}</span>
                    ))}
                  </div>
                  {/* CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-xs font-semibold text-gray-400">Export: XLSX · PDF · JSON</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500 group-hover:gap-2.5 transition-all">
                      Launch <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Website Scraper card */}
              <div onClick={() => navigate('/website-scraper')}
                className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-100"
                style={{ boxShadow: '0 2px 8px rgba(30,27,75,0.06)' }}>
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
                      <Globe className="w-6 h-6 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">Active</span>
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
                      Launch <ArrowRight className="w-3.5 h-3.5" />
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

      {/* ══ SUBSCRIPTION EXPIRED MODAL ══ */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Expired</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your <strong>{planLabel(plan as any)}</strong> plan has expired.
              Upgrade to continue using Scrapify and all premium features.
            </p>
            <button
              onClick={() => { setShowExpiredModal(false); navigate('/#pricing'); }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white mb-3"
              style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
              Upgrade Now
            </button>
            <button onClick={() => setShowExpiredModal(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              Maybe later
            </button>
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

      {/* ══ PROFILE / SETTINGS MODAL ══ */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100">
            <button onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileError(''); }}
              className="absolute top-5 right-5 bg-gray-50 hover:bg-gray-100 p-2 rounded-full text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-16 h-16 mb-3">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-indigo-100 shadow-lg">
                  {!avatarError
                    ? <img src="/avatar.png" alt="" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                    : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>{userInitials}</div>}
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Profile Overview</h2>
              <p className="text-sm text-gray-400">Manage your account details</p>
            </div>
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm rounded-r-lg">{profileError}</div>
            )}
            {!isEditingProfile ? (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Current Plan</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${planBadgeClass(plan as any)}`}>{planLabel(plan as any)}</span>
                </div>
                <button onClick={() => setIsEditingProfile(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
                {/* Logout inside profile */}
                <button onClick={() => { setShowSettings(false); setShowLogoutConfirm(true); }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required placeholder="Full name"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required placeholder="Email"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setIsEditingProfile(false); setEditName(user?.full_name||''); setEditEmail(user?.email||''); setProfileError(''); }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isUpdating}
                    className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
