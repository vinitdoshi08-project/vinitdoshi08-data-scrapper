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
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-[#e0354c] hover:bg-[#feeaed] transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: 'rgba(23,32,51,0.45)' }}>
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center border border-[#e4eaf3]">
            <div className="w-12 h-12 rounded-full bg-[#fff5df] flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-[#e59a26]" />
            </div>
            <h3 className="text-lg font-bold text-[#172033] mb-1">Sign out?</h3>
            <p className="text-sm text-[#758198] mb-5">You'll need to sign in again to access your account.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-[#e4eaf3] rounded-xl text-sm font-semibold text-[#526078] hover:bg-[#f6f8fc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#172033] hover:bg-[#25334d] transition-colors"
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
