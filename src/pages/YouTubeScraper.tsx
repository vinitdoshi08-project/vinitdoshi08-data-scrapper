import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel, planBadgeClass } from '../contexts/SubscriptionContext';
import { TrialGate } from '../components/TrialGate';
import { ProfileModal } from '../components/ProfileModal';
import {
  Youtube, Globe, Map, ArrowRight, FileSpreadsheet, FileText, FileJson,
  Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
  Eye, EyeOff, Clock, ThumbsUp, Hash, Key, Pencil, X, AlertTriangle,
  Info, LayoutDashboard, User, Settings, Bell, Crown, Plus, LogOut,
} from 'lucide-react';

const LS_KEY = 'yt_api_key';

interface VideoRow {
  title: string; channel: string; views: string;
  likes: string; published: string; url: string;
}
interface ScraperResult {
  fileName: string; fileFormat: string; videoCount: string; fileSize: string; rows: VideoRow[];
}

function buildPreviewRows(data: any[]): VideoRow[] {
  return data.slice(0, 20).map(item => ({
    title:     item['Video Title']        || item.title     || 'N/A',
    channel:   item['Channel Name']       || item.channel   || 'N/A',
    views:     item['Current Views']      || item.views     || 'N/A',
    likes:     item['Likes']              || item.likes     || 'N/A',
    published: item['Video Publish Date'] || item.published || 'N/A',
    url:       item['Video Link']         || item.url       || '#',
  }));
}

// ── API Key Bar ──────────────────────────────────────────────────────────────
function ApiKeyBar({ apiKey, onSave, onClear }: { apiKey: string; onSave: (k: string) => void; onClear: () => void }) {
  const [editing, setEditing] = useState(!apiKey);
  const [draft, setDraft]     = useState('');
  const [show, setShow]       = useState(false);
  useEffect(() => { if (!apiKey) setEditing(true); }, [apiKey]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed); setEditing(false); setDraft('');
  }
  const masked = apiKey ? apiKey.slice(0, 8) + '••••••••••••' + apiKey.slice(-4) : '';

  if (!editing && apiKey) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-3"
        style={{ boxShadow: '0 1px 4px rgba(30,27,75,0.05)' }}>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">YouTube API Key</p>
          <p className="text-sm font-mono text-gray-800 truncate">{show ? apiKey : masked}</p>
        </div>
        <button onClick={() => setShow(s => !s)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={() => { setDraft(apiKey); setEditing(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all">
          <Pencil className="w-3 h-3" /> Change
        </button>
        <button onClick={onClear} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-3"
      style={{ boxShadow: '0 1px 4px rgba(30,27,75,0.05)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Enter your YouTube Data API Key</p>
          <p className="text-xs text-gray-400 mt-0.5">Stored only in your browser — never sent to our servers</p>
        </div>
      </div>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} placeholder="AIzaSy..." autoFocus
          className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono" />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={!draft.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
          Save Key
        </button>
        {apiKey && (
          <button onClick={() => setEditing(false)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
        )}
      </div>
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-600 leading-relaxed">
          Get a free key at{' '}
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank" rel="noopener noreferrer" className="font-semibold underline">Google Cloud Console</a>
          {' '}→ Enable <strong>YouTube Data API v3</strong> → Create credentials → API Key. Free tier gives 10,000 units/day.
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function YouTubeScraper() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, signOut } = useAuth();
  const { plan, can_scrape, loading: subLoading } = useSubscription() as any;

  const [avatarError, setAvatarError]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY) || '');
  const [url, setUrl]               = useState('');
  const [fileName, setFileName]     = useState('');
  const [fileFormat, setFileFormat] = useState('xlsx');
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult]         = useState<ScraperResult | null>(null);
  const [error, setError]           = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const isPaid = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape;

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  function saveKey(k: string) { localStorage.setItem(LS_KEY, k); setApiKey(k); setError(''); setQuotaExceeded(false); }
  function clearKey() { localStorage.removeItem(LS_KEY); setApiKey(''); }

  async function getToken(): Promise<string> {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    } catch { return ''; }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey) { setError('Please enter your YouTube API key first.'); return; }
    setLoading(true); setProgress(0); setResult(null); setError(''); setQuotaExceeded(false);
    setProgressMsg('Connecting to YouTube API…');
    const interval = setInterval(() => {
      setProgress(p => {
        if (p < 30)  { setProgressMsg('Fetching video list…'); return p + 4; }
        if (p < 60)  { setProgressMsg('Extracting video details…'); return p + 3; }
        if (p < 85)  { setProgressMsg('Building your file…'); return p + 2; }
        return p;
      });
    }, 600);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('url', url); formData.append('file_name', fileName);
      formData.append('file_format', fileFormat); formData.append('token', token);
      formData.append('api_key', apiKey);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/scrape`, { method: 'POST', body: formData });
      clearInterval(interval); setProgress(100);
      if (!response.ok) {
        let message = 'Failed to scrape data';
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) { const j = await response.json(); message = j.detail || j.message || message; }
        } catch { /* ignore */ }
        const isQuota = response.status === 429 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('dailylimit');
        if (isQuota) { setQuotaExceeded(true); message = 'Your API key has reached its daily quota. Enter a new key and try again.'; }
        throw new Error(message);
      }
      const videoCount = response.headers.get('X-Video-Count') || '0';
      const rawSize    = parseInt(response.headers.get('Content-Length') || '0');
      const fileSize   = rawSize ? fmtBytes(rawSize) : 'N/A';
      const blob = await response.blob();
      let rows: VideoRow[] = [];
      if (fileFormat === 'json') {
        try { rows = buildPreviewRows(JSON.parse(await blob.text())); } catch { /* no preview */ }
      }
      const dlUrl = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: dlUrl, download: `${fileName}.${fileFormat}` }).click();
      URL.revokeObjectURL(dlUrl);
      setResult({ fileName, fileFormat, videoCount, fileSize, rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { clearInterval(interval); setLoading(false); }
  }

  function fmtBytes(b: number) {
    if (!b) return '0 B';
    const u = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / 1024 ** i).toFixed(1) + ' ' + u[i];
  }
  function reset() {
    setUrl(''); setFileName(''); setFileFormat('xlsx');
    setResult(null); setError(''); setProgress(0); setProgressMsg(''); setQuotaExceeded(false);
  }

  const formats = [
    { value:'xlsx', label:'Excel',  ext:'.xlsx', Icon: FileSpreadsheet, color:'emerald' },
    { value:'pdf',  label:'PDF',    ext:'.pdf',  Icon: FileText,        color:'red'     },
    { value:'json', label:'JSON',   ext:'.json', Icon: FileJson,        color:'amber'   },
  ];
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    red:     'border-red-400     bg-red-50     text-red-700',
    amber:   'border-amber-400   bg-amber-50   text-amber-700',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-600', red: 'text-red-500', amber: 'text-amber-500',
  };

  const navItems = [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard',       iColor: 'text-indigo-500'  },
    { label: 'YouTube Scraper', icon: Youtube,          path: '/youtube-scraper', iColor: 'text-red-400'     },
    { label: 'Website Scraper', icon: Globe,            path: '/website-scraper', iColor: 'text-emerald-500' },
  ];

  return (
    <TrialGate scraperName="YouTube Scraper">
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', background: 'linear-gradient(135deg,#f0f4ff 0%,#f8faff 45%,#f0fdf8 100%)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside className={`flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0 ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
        style={{ boxShadow: '2px 0 20px rgba(0,0,0,0.035)' }}>
        <div className={`flex items-center h-[72px] shrink-0 border-b border-gray-200 ${sidebarCollapsed ? 'justify-center px-3' : 'px-5'}`}>
          {sidebarCollapsed
            ? <img src="/scrapify.png" alt="S" className="h-10 w-10 object-contain" />
            : <img src="/scrapify.png" alt="Scrapify" className="h-[52px] w-auto object-contain max-w-[200px]" />}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-6 pb-2 space-y-6">
          <div>
            {!sidebarCollapsed && <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.18em] px-2 mb-2">Workspace</p>}
            <div className="space-y-1">
              {navItems.map(item => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center h-10 rounded-xl text-[13px] font-semibold transition-all duration-150
                      ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'}
                      ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : item.iColor}`} />
                    {!sidebarCollapsed && <span className="truncate leading-none">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            {!sidebarCollapsed && <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.18em] px-2 mb-2">Account</p>}
            <div className="space-y-1">
              {[{ label:'Profile', icon: User, iColor:'text-indigo-400' }, { label:'Settings', icon: Settings, iColor:'text-gray-400' }].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => setShowSettings(true)}
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
                    <span className={`text-[13px] font-bold ${isPaid ? 'text-indigo-800' : 'text-amber-800'}`}>{planLabel(plan as any)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-100 text-red-600' : isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
                {!isPaid && !isExpired && (
                  <button onClick={() => navigate('/#pricing')}
                    className="w-full mt-3 text-[11px] font-bold text-white py-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#4F46E5,#6D5FE8)' }}>Upgrade Plan</button>
                )}
              </>
            )}
          </div>
        )}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 transition-colors shrink-0 select-none text-lg font-light">
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-[72px] bg-white border-b border-gray-200 flex items-center px-8 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-gray-900 leading-none">YouTube Scraper</h2>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Extract video data from any YouTube video or playlist</p>
          </div>
          <div className="flex items-center gap-4">
            {subLoading
              ? <span className="hidden sm:inline-flex w-16 h-6 rounded-lg bg-gray-100 animate-pulse" />
              : <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${planBadgeClass(plan as any)}`}>
                  <Crown className="w-3 h-3" />{planLabel(plan as any)}
                </span>
            }
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
              <div className="w-[32px] h-[32px] rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-bold ring-2 ring-indigo-100"
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
        <main className="flex-1 overflow-y-auto p-6">

          {/* Hero banner */}
          <div className="rounded-2xl px-8 py-6 flex items-center gap-5 mb-6"
            style={{ background:'linear-gradient(135deg,#DC2626 0%,#9B1C1C 100%)', boxShadow:'0 8px 32px -4px rgba(220,38,38,0.25)' }}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Youtube className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white leading-none">YouTube Data Scraper</h1>
              <p className="text-red-200 text-sm mt-1.5">Extract video metadata, view counts, likes, and more from any YouTube video or playlist</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {['Videos', 'Channels', 'Playlists'].map(t => (
                <span key={t} className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Left col — form (wider) */}
            <div className="xl:col-span-3 space-y-5">

              {/* API Key */}
              <ApiKeyBar apiKey={apiKey} onSave={saveKey} onClear={clearKey} />

              {/* Quota banner */}
              {quotaExceeded && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-0.5">Daily quota reached</p>
                    <p className="text-xs text-amber-700 leading-relaxed">Your API key has used all 10,000 free daily units. Use <strong>Change</strong> above to swap in a new key.</p>
                  </div>
                </div>
              )}

              {/* Scrape form */}
              {!result && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5"
                  style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">YouTube URL</label>
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or playlist URL" required
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                    <p className="mt-1.5 text-xs text-gray-400">Supports single videos and full playlists</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Output File Name</label>
                    <input type="text" value={fileName} onChange={e => setFileName(e.target.value)}
                      placeholder="my-youtube-data" required
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Export Format</label>
                    <div className="grid grid-cols-3 gap-3">
                      {formats.map(({ value, label, ext, Icon, color }) => (
                        <label key={value}
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${fileFormat === value ? colorMap[color] : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                          <input type="radio" name="format" value={value} checked={fileFormat === value} onChange={e => setFileFormat(e.target.value)} className="sr-only" />
                          <Icon className={`w-5 h-5 shrink-0 ${fileFormat === value ? iconColorMap[color] : 'text-gray-400'}`} />
                          <div><p className="font-semibold text-sm leading-none">{label}</p><p className="text-xs opacity-60 mt-0.5">{ext}</p></div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{progressMsg}</span><span className="font-semibold">{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width:`${progress}%`, background:'linear-gradient(90deg,#DC2626,#F97316)' }} />
                      </div>
                    </div>
                  )}
                  {error && !quotaExceeded && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={loading || !apiKey || !url || !fileName}
                    className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ background:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)' }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</> : <><Download className="w-4 h-4" />Extract &amp; Download</>}
                  </button>
                  {!apiKey && <p className="text-center text-xs text-gray-400">⬆ Enter your API key above to enable extraction</p>}
                </form>
              )}

              {/* Success */}
              {result && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-emerald-100 p-6" style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Extraction complete!</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Your file downloaded automatically</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { l:'File', v:`${result.fileName}.${result.fileFormat}` },
                        { l:'Videos', v: result.videoCount },
                        { l:'Size', v: result.fileSize },
                        { l:'Format', v: result.fileFormat.toUpperCase() },
                      ].map(s => (
                        <div key={s.l} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.l}</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{s.v}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={reset}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                      style={{ background:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)' }}>
                      <RefreshCw className="w-4 h-4" /> Extract Another
                    </button>
                  </div>
                  {result.rows.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center" style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
                      <p className="text-sm text-gray-500">Data preview is available for <strong>JSON</strong> format only. Your <strong>{result.fileFormat.toUpperCase()}</strong> file has been downloaded.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right col — info panel */}
            <div className="xl:col-span-2 space-y-5">

              {/* What gets extracted */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-900 mb-4">What gets extracted</h3>
                <div className="space-y-2.5">
                  {[
                    { Icon: Hash,         color:'text-red-400',     text:'Video title & URL',  desc:'Full title and direct link' },
                    { Icon: Youtube,      color:'text-red-500',     text:'Channel name',        desc:'Publisher channel info'     },
                    { Icon: Eye,          color:'text-indigo-400',  text:'View count',          desc:'Total views at scrape time' },
                    { Icon: ThumbsUp,     color:'text-indigo-500',  text:'Like count',          desc:'Public like count'          },
                    { Icon: Clock,        color:'text-emerald-400', text:'Publish date',        desc:'Original upload date'       },
                    { Icon: ExternalLink, color:'text-emerald-500', text:'Subscriber count',    desc:'Channel subscriber count'   },
                  ].map(({ Icon, color, text, desc }) => (
                    <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-gray-100`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 leading-none">{text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Tips</h3>
                <div className="space-y-3">
                  {[
                    { emoji:'🎬', tip:'Paste a full playlist URL to extract all videos at once.' },
                    { emoji:'🔑', tip:'Your API key is stored only in this browser — never on our servers.' },
                    { emoji:'📊', tip:'Use Excel format for easy spreadsheet editing.' },
                    { emoji:'🔄', tip:'Free API keys reset daily at midnight Pacific time.' },
                  ].map(({ emoji, tip }) => (
                    <div key={tip} className="flex items-start gap-3">
                      <span className="text-base leading-none mt-0.5">{emoji}</span>
                      <p className="text-xs text-gray-500 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data table (full width, only for JSON) */}
          {result && result.rows.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow:'0 1px 4px rgba(30,27,75,0.05)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Extracted Data Preview</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Showing first {result.rows.length} rows</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">{result.videoCount} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {[{Icon:Hash,label:'Title'},{Icon:Youtube,label:'Channel'},{Icon:Eye,label:'Views'},{Icon:ThumbsUp,label:'Likes'},{Icon:Clock,label:'Published'},{Icon:ExternalLink,label:'Link'}].map(({ Icon, label }) => (
                        <th key={label} className="text-left px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <Icon className="w-3 h-3" />{label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">{row.title}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.channel}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.views}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.likes}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.published}</td>
                        <td className="px-4 py-3">
                          <a href={row.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Profile / Settings modal */}
      {showSettings && <ProfileModal onClose={() => setShowSettings(false)} />}
    </div>
    </TrialGate>
  );
}
