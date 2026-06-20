import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Youtube, ArrowLeft, FileSpreadsheet, FileText, FileJson,
  Download, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Eye, EyeOff, Clock, ThumbsUp, Hash,
  Key, Pencil, X, AlertTriangle, Info,
} from 'lucide-react';

const LS_KEY = 'yt_api_key';

interface VideoRow {
  title: string;
  channel: string;
  views: string;
  likes: string;
  published: string;
  url: string;
}

interface ScraperResult {
  fileName: string;
  fileFormat: string;
  videoCount: string;
  fileSize: string;
  rows: VideoRow[];
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
function ApiKeyBar({
  apiKey, onSave, onClear,
}: { apiKey: string; onSave: (k: string) => void; onClear: () => void }) {
  const [editing, setEditing] = useState(!apiKey);
  const [draft, setDraft]     = useState('');
  const [show, setShow]       = useState(false);

  useEffect(() => { if (!apiKey) setEditing(true); }, [apiKey]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
    setDraft('');
  }

  const masked = apiKey ? apiKey.slice(0, 8) + '••••••••••••' + apiKey.slice(-4) : '';

  if (!editing && apiKey) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-3"
        style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 mb-0.5">YouTube API Key</p>
          <p className="text-sm font-mono text-gray-800 truncate">{show ? apiKey : masked}</p>
        </div>
        <button onClick={() => setShow(s => !s)}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={() => { setDraft(apiKey); setEditing(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all">
          <Pencil className="w-3 h-3" /> Change
        </button>
        <button onClick={onClear}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 p-5 space-y-3"
      style={{ boxShadow: '0 1px 4px 0 rgba(30,27,75,0.05)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Enter your YouTube Data API Key</p>
          <p className="text-xs text-gray-400">Stored only in your browser — never sent to our servers</p>
        </div>
      </div>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="AIzaSy..."
          autoFocus
          className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={!draft.trim()}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, oklch(54% .22 277) 0%, oklch(66% .21 290) 100%)' }}>
          Save Key
        </button>
        {apiKey && (
          <button onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-600 leading-relaxed">
          Get a free key at{' '}
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank" rel="noopener noreferrer"
            className="font-semibold underline">
            Google Cloud Console
          </a>
          {' '}→ Enable <strong>YouTube Data API v3</strong> → Create credentials → API Key.
          Free tier gives 10,000 units/day.
        </p>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function YouTubeScraper() {
  const navigate  = useNavigate();
  const { signOut } = useAuth();

  // API key — localStorage only, never goes to our DB
  const [apiKey, setApiKey]   = useState<string>(() => localStorage.getItem(LS_KEY) || '');

  const [url, setUrl]               = useState('');
  const [fileName, setFileName]     = useState('');
  const [fileFormat, setFileFormat] = useState('xlsx');
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult]         = useState<ScraperResult | null>(null);
  const [error, setError]           = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  function saveKey(k: string) {
    localStorage.setItem(LS_KEY, k);
    setApiKey(k);
    setError('');
    setQuotaExceeded(false);
  }
  function clearKey() {
    localStorage.removeItem(LS_KEY);
    setApiKey('');
  }

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
      formData.append('url', url);
      formData.append('file_name', fileName);
      formData.append('file_format', fileFormat);
      formData.append('token', token);
      formData.append('api_key', apiKey);   // sent per-request only, never stored server-side

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/scrape`, { method: 'POST', body: formData });

      clearInterval(interval);
      setProgress(100);

      if (!response.ok) {
        let message = 'Failed to scrape data';
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await response.json();
            message = j.detail || j.message || message;
          }
        } catch { /* ignore */ }

        const isQuota = response.status === 429
          || message.toLowerCase().includes('quota')
          || message.toLowerCase().includes('dailylimit');
        if (isQuota) {
          setQuotaExceeded(true);
          message = 'Your API key has reached its daily quota. Enter a new key and try again.';
        }
        throw new Error(message);
      }

      const videoCount = response.headers.get('X-Video-Count') || '0';
      const rawSize    = parseInt(response.headers.get('Content-Length') || '0');
      const fileSize   = rawSize ? fmtBytes(rawSize) : 'N/A';

      const blob = await response.blob();

      // Build preview from JSON response if format is json
      let rows: VideoRow[] = [];
      if (fileFormat === 'json') {
        try { rows = buildPreviewRows(JSON.parse(await blob.text())); } catch { /* no preview */ }
      }

      // Trigger download
      const dlUrl = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: dlUrl, download: `${fileName}.${fileFormat}` }).click();
      URL.revokeObjectURL(dlUrl);

      setResult({ fileName, fileFormat, videoCount, fileSize, rows });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  function fmtBytes(b: number) {
    if (!b) return '0 B';
    const u = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / 1024 ** i).toFixed(1) + ' ' + u[i];
  }

  function reset() {
    setUrl(''); setFileName(''); setFileFormat('xlsx');
    setResult(null); setError(''); setProgress(0); setProgressMsg('');
    setQuotaExceeded(false);
  }

  const formats = [
    { value:'xlsx', label:'Excel',  ext:'.xlsx', Icon: FileSpreadsheet, color:'emerald' },
    { value:'pdf',  label:'PDF',    ext:'.pdf',  Icon: FileText,        color:'red'     },
    { value:'json', label:'JSON',   ext:'.json', Icon: FileJson,        color:'amber'   },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    red:     'border-red-400     bg-red-50     text-red-700',
    amber:   'border-amber-400   bg-amber-50   text-amber-700',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-600', red: 'text-red-500', amber: 'text-amber-500',
  };

  return (
    <div className="min-h-screen" style={{ background:'oklch(0.985 0.005 250)', fontFamily:'ui-sans-serif, system-ui, sans-serif' }}>

      {/* NAV */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between h-14">
          <button onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <img src="/scrapify.png" alt="Scrapify" className="h-12 w-auto object-contain" />
          <button onClick={() => signOut().then(() => navigate('/'))}
            className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* HEADER */}
        <div className="rounded-2xl px-8 py-6 flex items-center gap-4"
          style={{ background:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)', boxShadow:'0 8px 32px -4px rgba(220,38,38,0.28)' }}>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Youtube className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">YouTube Data Scraper</h1>
            <p className="text-red-200 text-sm mt-0.5">Extract video data from any YouTube video or playlist</p>
          </div>
        </div>

        {/* API KEY BAR — always visible */}
        <ApiKeyBar apiKey={apiKey} onSave={saveKey} onClear={clearKey} />

        {/* QUOTA EXCEEDED BANNER */}
        {quotaExceeded && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Daily quota reached</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Your API key has used all 10,000 free daily units. Use the <strong>Change</strong> button above to swap in a new key — it's stored only in your browser.
              </p>
            </div>
          </div>
        )}

        {/* FORM */}
        {!result && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-7 space-y-5"
            style={{ boxShadow:'0 1px 4px 0 rgba(30,27,75,0.05)' }}>

            {/* URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">YouTube URL</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or playlist URL" required
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
              <p className="mt-1.5 text-xs text-gray-400">Supports single videos and full playlists</p>
            </div>

            {/* File name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Output File Name</label>
              <input type="text" value={fileName} onChange={e => setFileName(e.target.value)}
                placeholder="my-youtube-data" required
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent" />
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Export Format</label>
              <div className="grid grid-cols-3 gap-3">
                {formats.map(({ value, label, ext, Icon, color }) => (
                  <label key={value}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${fileFormat === value ? colorMap[color] : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <input type="radio" name="format" value={value}
                      checked={fileFormat === value} onChange={e => setFileFormat(e.target.value)} className="sr-only" />
                    <Icon className={`w-5 h-5 shrink-0 ${fileFormat === value ? iconColorMap[color] : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs opacity-60">{ext}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Progress */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{progressMsg}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${progress}%`, background:'linear-gradient(90deg,#DC2626,#F97316)' }} />
                </div>
              </div>
            )}

            {/* Error inline */}
            {error && !quotaExceeded && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || !apiKey || !url || !fileName}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)' }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting…</>
                : <><Download className="w-4 h-4" /> Extract &amp; Download</>}
            </button>

            {!apiKey && (
              <p className="text-center text-xs text-gray-400">⬆ Enter your API key above to enable extraction</p>
            )}
          </form>
        )}

        {/* SUCCESS */}
        {result && (
          <div className="space-y-5">
            {/* Banner */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-6"
              style={{ boxShadow:'0 1px 4px 0 rgba(30,27,75,0.05)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Extraction complete!</h3>
                  <p className="text-xs text-gray-400">Your file downloaded automatically</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { l:'File',    v:`${result.fileName}.${result.fileFormat}` },
                  { l:'Videos',  v: result.videoCount },
                  { l:'Size',    v: result.fileSize },
                  { l:'Format',  v: result.fileFormat.toUpperCase() },
                ].map(s => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.l}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{s.v}</p>
                  </div>
                ))}
              </div>
              <button onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
                style={{ background:'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)' }}>
                <RefreshCw className="w-4 h-4" /> Extract Another
              </button>
            </div>

            {/* Data table — shown if JSON format returned parseable rows */}
            {result.rows.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow:'0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Extracted Data Preview</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Showing first {result.rows.length} rows</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {result.videoCount} total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {[
                          { Icon: Hash,      label:'Title'     },
                          { Icon: Youtube,   label:'Channel'   },
                          { Icon: Eye,       label:'Views'     },
                          { Icon: ThumbsUp,  label:'Likes'     },
                          { Icon: Clock,     label:'Published' },
                          { Icon: ExternalLink, label:'Link'   },
                        ].map(({ Icon, label }) => (
                          <th key={label} className="text-left px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              <Icon className="w-3 h-3" />{label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{row.title}</td>
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

            {/* No preview for xlsx/pdf */}
            {result.rows.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center"
                style={{ boxShadow:'0 1px 4px 0 rgba(30,27,75,0.05)' }}>
                <p className="text-sm text-gray-500">
                  Data preview is available for <strong>JSON</strong> format only.
                  Your <strong>{result.fileFormat.toUpperCase()}</strong> file has been downloaded.
                </p>
              </div>
            )}
          </div>
        )}

        {/* WHAT GETS EXTRACTED */}
        {!result && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow:'0 1px 4px 0 rgba(30,27,75,0.05)' }}>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">What data gets extracted?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { Icon: Hash,        color:'text-red-400',     text:'Video title & URL'    },
                { Icon: Youtube,     color:'text-red-400',     text:'Channel name'         },
                { Icon: Eye,         color:'text-indigo-400',  text:'View count'           },
                { Icon: ThumbsUp,    color:'text-indigo-400',  text:'Like count'           },
                { Icon: Clock,       color:'text-emerald-400', text:'Publish date'         },
                { Icon: ExternalLink,color:'text-emerald-400', text:'Subscriber count'     },
              ].map(({ Icon, color, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} /> {text}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
