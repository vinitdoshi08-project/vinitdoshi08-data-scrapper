import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Youtube, Globe, Map, LogOut, Settings, ArrowRight, X,
  Edit2, Check, Loader2, LayoutDashboard, User, Bell, Search,
  TrendingUp, Zap, BarChart2, CheckCircle2, Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';

const recentScrapes = [
  { name: 'accountants in London, UK',  source: 'Website', status: 'completed', rows: 142,  when: '2h ago'   },
  { name: 'Marques Brownlee — Playlist', source: 'YouTube', status: 'completed', rows: 387,  when: '5h ago'   },
  { name: 'marketing agencies NYC',      source: 'Website', status: 'running',   rows: 24,   when: 'Just now' },
  { name: 'Lex Fridman Podcast',         source: 'YouTube', status: 'completed', rows: 412,  when: '1d ago'   },
  { name: 'real estate brokers Miami',   source: 'Website', status: 'failed',    rows: 0,    when: '2d ago'   },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    running:   'bg-indigo-50  text-indigo-600  border-indigo-200',
    failed:    'bg-red-50     text-red-500     border-red-200',
  };
  const dot: Record<string, string> = {
    completed: 'bg-emerald-500',
    running:   'bg-indigo-500',
    failed:    'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? 'bg-gray-400'}`} />
      {status}
    </span>
  );
}

export function Dashboard() {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showComingSoon, setShowComingSoon] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) { setEditName(user.full_name || ''); setEditEmail(user.email || ''); }
  }, [user]);

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

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
    try { await signOut(); navigate('/'); } catch (e) { console.error(e); }
  }

  const kpis = [
    { label: 'Total scrapes', value: '12,438', sub: '▲ +24%', subColor: 'text-emerald-500', icon: <BarChart2 className="w-4 h-4 text-indigo-500" />,  iconBg: 'bg-indigo-50'  },
    { label: 'Active jobs',   value: '8',      sub: 'Live',   subColor: 'text-blue-500',    icon: <Zap       className="w-4 h-4 text-blue-500"   />,  iconBg: 'bg-blue-50'    },
    { label: 'This month',    value: '3,221',  sub: '▲ +12%', subColor: 'text-emerald-500', icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, iconBg: 'bg-emerald-50' },
    { label: 'Success rate',  value: '99.8%',  sub: 'Stable', subColor: 'text-emerald-500', icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />, iconBg: 'bg-purple-50'  },
  ];

  const navItems = [
    { label: 'Dashboard',      icon: LayoutDashboard, path: '/dashboard',       activeColor: 'text-white',      inactiveColor: 'text-indigo-500'  },
    { label: 'YouTube Scraper',icon: Youtube,          path: '/youtube-scraper', activeColor: 'text-white',      inactiveColor: 'text-red-400'     },
    { label: 'Website Scraper',icon: Globe,            path: '/website-scraper', activeColor: 'text-white',      inactiveColor: 'text-emerald-500' },
  ];
  const accountItems = [
    { label: 'Profile',  icon: User,     action: () => { setShowSettings(true); setIsEditingProfile(false); }, color: 'text-blue-400'   },
    { label: 'Settings', icon: Settings, action: () => { setShowSettings(true); setIsEditingProfile(false); }, color: 'text-gray-400'   },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', background: 'oklch(0.985 0.005 250)' }}>

      {/* ── SIDEBAR ── */}
      <aside className={`flex flex-col bg-white border-r border-gray-100 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'} shrink-0`}>
        {/* Logo */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 h-14">
          {sidebarCollapsed
            ? <img src="/scrapify.png" alt="Scrapify" className="h-8 w-8 object-contain shrink-0" />
            : <img src="/scrapify.png" alt="Scrapify" className="h-11 w-auto object-contain" />
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {!sidebarCollapsed && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-3">Workspace</p>}
          {navItems.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <Icon className={`w-4 h-4 shrink-0 ${active ? item.activeColor : item.inactiveColor}`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          <div className="pt-5">
            {!sidebarCollapsed && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-3">Account</p>}
            {accountItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Upgrade banner */}
        {!sidebarCollapsed && (
          <div className="mx-3 mb-3 rounded-xl p-4 border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
            <p className="text-xs font-bold text-indigo-700 mb-1">Upgrade to Pro</p>
            <p className="text-[11px] text-indigo-400 leading-snug mb-3">Unlock unlimited scrapes and advanced exports.</p>
            <button className="w-full text-xs font-semibold text-white py-2 rounded-lg transition-opacity hover:opacity-90" style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>Upgrade</button>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 text-sm font-bold transition-colors">
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          {/* Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input placeholder="Search scrapers, jobs, history…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Bell */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            {/* Avatar */}
            <button onClick={() => { setShowSettings(true); setIsEditingProfile(false); }}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                {avatarError
                  ? userInitials
                  : <img src="/avatar.png" alt="" className="w-full h-full object-cover rounded-full" onError={() => setAvatarError(true)} />}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name || 'User'}</span>
            </button>
            {/* Logout */}
            <button onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Welcome row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back {firstName} 👋</h1>
              <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your scrapers today.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}
              onClick={() => navigate('/youtube-scraper')}
            >
              <Plus className="w-4 h-4" /> New scrape
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                  <div className={`w-7 h-7 rounded-lg ${k.iconBg} flex items-center justify-center`}>
                    {k.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{k.value}</p>
                <p className={`text-xs font-medium ${k.subColor}`}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick start */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Quick start</h2>
            <p className="text-sm text-gray-500 mb-4">Choose a scraper to begin extracting data.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* YouTube */}
              <div onClick={() => navigate('/youtube-scraper')}
                className="bg-white rounded-xl border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-red-100 transition-all group"
                style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">YouTube Scraper</h3>
                <p className="text-xs text-gray-400 mb-5">Videos, channels, playlists</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 group-hover:gap-2.5 transition-all">
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Website */}
              <div onClick={() => navigate('/website-scraper')}
                className="bg-white rounded-xl border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-emerald-100 transition-all group"
                style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                  <Globe className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">Website Scraper</h3>
                <p className="text-xs text-gray-400 mb-5">AI-powered lead extractor</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 group-hover:gap-2.5 transition-all">
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Map — coming soon */}
              <div className="relative bg-white rounded-xl border border-gray-100 p-6 cursor-default"
                style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <span className="absolute top-4 right-4 text-[10px] font-bold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full uppercase tracking-wide">Soon</span>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-5">
                  <Map className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-bold text-gray-400 mb-1.5">Map Scraper</h3>
                <p className="text-xs text-gray-400 mb-5">Coming soon</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-300">
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Recent scrapes table */}
          <div className="bg-white rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
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
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Source</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Rows</th>
                    <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentScrapes.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900 max-w-[220px] truncate">{row.name}</td>
                      <td className="px-4 py-3.5 text-gray-500">{row.source}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3.5 text-right text-gray-700 font-medium">{row.rows}</td>
                      <td className="px-6 py-3.5 text-right text-gray-400">{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>{/* end MAIN */}

      {/* ── COMING SOON MODAL ── */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowComingSoon(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Map className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Map Scraper</h3>
              <p className="text-sm text-gray-500 mb-6">Coming soon! We're building the best map scraping experience.</p>
              <button onClick={() => setShowComingSoon(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>Got it!</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowLogoutConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full">
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

      {/* ── PROFILE / SETTINGS MODAL ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100">
            <button onClick={() => { setShowSettings(false); setIsEditingProfile(false); setProfileError(''); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full">
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
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                </div>
                <button onClick={() => setIsEditingProfile(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter full name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter email" required />
                </div>
                <div className="flex gap-3 pt-2">
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
