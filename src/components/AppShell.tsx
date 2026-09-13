import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { ProfileModal } from './ProfileModal';
import {
  LayoutDashboard, Youtube, Globe, Map, CreditCard, Settings2,
  Zap, ChevronDown, LogOut, User, Menu, X,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',          path: '/dashboard',       icon: LayoutDashboard },
  { label: 'YouTube Scraper',    path: '/youtube-scraper', icon: Youtube },
  { label: 'Website Scraper',    path: '/website-scraper', icon: Globe },
  { label: 'Map Scraper',        path: '/map-scraper',     icon: Map },
  { label: 'Subscription',       path: '/subscription',    icon: CreditCard },
  { label: 'Profile & Settings', path: '/profile',         icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, signOut } = useAuth();
  const { plan } = useSubscription() as any;

  const [showProfile, setShowProfile] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'JD';

  const displayName = user?.full_name || 'Jordan Davis';

  async function handleSignOut() {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell flex flex-col min-h-screen">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-inner">
          {/* Brand Logo - Original Scrapify Logo */}
          <Link to="/dashboard" className="brand-logo-link flex items-center" title="Scrapify Dashboard">
            <img
              src="/scrapify_logo.png"
              alt="Scrapify"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Navigation links */}
          <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`}>
            {navItems.map(({ label, path, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => {
                    navigate(path);
                    setMobileOpen(false);
                  }}
                  className={`nav-item ${active ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Account and plan area */}
          <div className="account-area">
            {/* Plan pill */}
            <div
              className="plan-pill cursor-pointer"
              onClick={() => navigate('/subscription')}
              title="Click to view subscription"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span>
                {plan === 'basic' ? 'Basic' : plan === 'standard' ? 'Standard' : 'Starter'}
              </span>
            </div>

            {/* Avatar */}
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer"
                onClick={() => setDropOpen(o => !o)}
              />
            ) : (
              <div
                className="avatar cursor-pointer"
                onClick={() => setDropOpen(o => !o)}
              >
                {userInitials}
              </div>
            )}

            {/* Account dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropOpen(o => !o)}
                className="account-name hover:opacity-80 transition-opacity"
              >
                <span>{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#526078]" />
              </button>

              {dropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-[#e4eaf3] shadow-lg z-40 py-1.5 overflow-hidden">
                    <button
                      onClick={() => { navigate('/profile'); setDropOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-[#445168] hover:bg-[#edf1ff] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#344de1]" /> Profile &amp; Settings
                    </button>
                    <button
                      onClick={() => { navigate('/subscription'); setDropOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-[#445168] hover:bg-[#edf1ff] transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-[#344de1]" /> Subscription
                    </button>
                    <div className="border-t border-[#e4eaf3] my-1" />
                    <button
                      onClick={() => { setShowLogoutConfirm(true); setDropOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-[#dc2626]" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-menu p-1 ml-1 text-gray-700"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Sign out confirm modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300"
          style={{ background: 'rgba(15, 23, 42, 0.55)' }}
        >
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-[#e2e8f0] transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-2 tracking-tight">Sign out?</h3>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
              Are you sure you want to sign out? You will need to sign in again to access your scrapers.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#475569] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1] hover:text-[#1e293b] hover:shadow-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-white hover:to-white hover:text-red-600 hover:border-red-600 border border-transparent shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
