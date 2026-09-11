import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { TrialGate } from '../components/TrialGate';
import { AppShell } from '../components/AppShell';
import {
  Youtube, FileSpreadsheet, FileText, FileJson,
  Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
  Eye, EyeOff, Clock, Key, Pencil, X, AlertTriangle,
  Info, Play, Search, Video, BarChart2, Tv, ChevronDown,
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
  const masked = apiKey ? apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4) : '';

  if (!editing && apiKey) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">YouTube API Key</p>
          <p className="text-sm font-mono font-medium text-gray-800 truncate">{show ? apiKey : masked}</p>
        </div>
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title={show ? "Hide key" : "Show key"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => { setDraft(apiKey); setEditing(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          <Pencil className="w-3 h-3" /> Change
        </button>
        <button
          type="button"
          onClick={onClear}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove key"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Enter your YouTube Data API Key</p>
          <p className="text-xs text-gray-400 mt-0.5">Stored only in your browser — never sent to our servers</p>
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
          className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-gray-800"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={save}
          disabled={!draft.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
        >
          Save Key
        </button>
        {apiKey && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Get a free key at{' '}
          <a
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:text-blue-800"
          >
            Google Cloud Console
          </a>{' '}
          → Enable <strong>YouTube Data API v3</strong> → Credentials → API Key. Free tier: 10,000 units/day.
        </p>
      </div>
    </div>
  );
}

export function YouTubeScraper() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY) || '');
  const [url, setUrl]               = useState('');
  const [fileName, setFileName]     = useState('');
  const [fileFormat, setFileFormat] = useState('xlsx');
  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [maxVideos, setMaxVideos]   = useState('10');
  const [sortBy, setSortBy]         = useState('newest');
  const [result, setResult]         = useState<ScraperResult | null>(null);
  const [error, setError]           = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  function saveKey(k: string) { localStorage.setItem(LS_KEY, k); setApiKey(k); setError(''); setQuotaExceeded(false); }
  function clearKey() { localStorage.removeItem(LS_KEY); setApiKey(''); }

  async function getToken(): Promise<string> {
    try {
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
        if (p < 40)  { setProgressMsg('Fetching video list…'); return p + 8; }
        if (p < 75)  { setProgressMsg('Extracting video details…'); return p + 5; }
        if (p < 90)  { setProgressMsg('Building your file…'); return p + 2; }
        return p;
      });
    }, 250);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('url', url); formData.append('file_name', fileName);
      formData.append('file_format', fileFormat); formData.append('token', token);
      formData.append('api_key', apiKey);
      formData.append('max_results', maxVideos);
      formData.append('sort_by', sortBy);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/scrape`, { method: 'POST', body: formData });
      clearInterval(interval); setProgress(100); setProgressMsg('Extraction complete!');
      if (!response.ok) {
        let message = 'Failed to scrape data';
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) { const j = await response.json(); message = j.detail || j.message || message; }
        } catch { }
        const isQuota = response.status === 429 || message.toLowerCase().includes('quota');
        if (isQuota) { setQuotaExceeded(true); message = 'Your API key has reached its daily quota. Enter a new key and try again.'; }
        throw new Error(message);
      }
      const videoCount = response.headers.get('X-Video-Count') || '0';
      const rawSize    = parseInt(response.headers.get('Content-Length') || '0');
      const fileSize   = rawSize ? fmtBytes(rawSize) : 'N/A';
      const blob = await response.blob();
      let rows: VideoRow[] = [];
      if (fileFormat === 'json') {
        try { rows = buildPreviewRows(JSON.parse(await blob.text())); } catch { }
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

  return (
    <AppShell>
      <TrialGate scraperName="YouTube Scraper">
        <div className="page">

          {/* Page heading */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUTUBE VIDEO DATA</p>
              <h1>Channel data, ready to analyse</h1>
              <p className="heading-copy">Paste a channel, playlist or search term — get videos, stats and channel details.</p>
            </div>
            <button
              onClick={handleSubmit as any}
              disabled={loading || !apiKey || !url || !fileName}
              className="primary-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(100deg, #e0354c, #c41e3a)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>Run scrape</span>
            </button>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Left: form */}
            <div className="xl:col-span-3 space-y-5">
              <ApiKeyBar apiKey={apiKey} onSave={saveKey} onClear={clearKey} />

              {quotaExceeded && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-0.5">Daily quota reached</p>
                    <p className="text-xs text-amber-700 leading-relaxed">Your API key used all 10,000 free daily units. Use <strong>Change</strong> above to swap in a new key.</p>
                  </div>
                </div>
              )}

              {!result && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-6">
                  {/* Channel / URL */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                      Channel, playlist or keyword
                    </label>
                    <div className="relative">
                      <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none" />
                      <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://youtube.com/@channel or playlist URL"
                        required
                        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800 placeholder-gray-400 bg-white transition-all font-medium"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Supports single videos, playlists, channel handles (@name), and keywords
                    </p>
                  </div>

                  {/* Dropdowns: Max videos & Sort by */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                        Max videos
                      </label>
                      <div className="relative">
                        <select
                          value={maxVideos}
                          onChange={e => setMaxVideos(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white appearance-none cursor-pointer text-gray-800 font-medium transition-all"
                        >
                          <option value="10">10 videos</option>
                          <option value="25">25 videos</option>
                          <option value="50">50 videos</option>
                          <option value="100">100 videos</option>
                          <option value="200">200 videos</option>
                          <option value="all">All (Full playlist)</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                        Sort by
                      </label>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white appearance-none cursor-pointer text-gray-800 font-medium transition-all"
                        >
                          <option value="newest">Newest first</option>
                          <option value="views">Most views</option>
                          <option value="likes">Most likes</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Output file name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                      Output file name
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        placeholder="my-youtube-data"
                        required
                        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800 placeholder-gray-400 bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Export format */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2.5">
                      Export format
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {formats.map(({ value, label, ext, Icon, color }) => {
                        const isSelected = fileFormat === value;
                        return (
                          <label
                            key={value}
                            className={`relative flex items-center gap-3 p-3.5 border-2 rounded-2xl cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? color === 'emerald'
                                  ? 'border-emerald-500 bg-emerald-50/60 shadow-sm shadow-emerald-500/10'
                                  : color === 'red'
                                  ? 'border-red-500 bg-red-50/60 shadow-sm shadow-red-500/10'
                                  : 'border-blue-500 bg-blue-50/60 shadow-sm shadow-blue-500/10'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                            }`}
                          >
                            <input
                              type="radio"
                              name="format"
                              value={value}
                              checked={isSelected}
                              onChange={e => setFileFormat(e.target.value)}
                              className="sr-only"
                            />
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? color === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : color === 'red'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-blue-100 text-blue-600'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                {label}
                              </p>
                              <p className="text-[11px] font-mono text-gray-400 mt-0.5">{ext}</p>
                            </div>
                            {isSelected && (
                              <div
                                className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${
                                  color === 'emerald' ? 'bg-emerald-500' : color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {loading && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{progressMsg}</span>
                        <span className="font-bold text-red-600">{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #e0354c, #f97316)' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {error && !quotaExceeded && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading || !apiKey || !url || !fileName}
                      className="flex-1 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #e0354c 0%, #c41e3a 100%)' }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Extracting…</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Start scraping</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="h-12 px-6 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                      <span>Reset</span>
                    </button>
                  </div>
                  {!apiKey && (
                    <p className="text-center text-xs text-gray-400">⬆ Enter your API key above to enable extraction</p>
                  )}
                </form>
              )}

              {result && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-emerald-100/80 shadow-sm p-7">
                    <div className="flex items-center gap-3.5 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 font-['Space_Grotesk']">Extraction complete!</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Your file downloaded automatically</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 mb-6">
                      {[
                        { l:'File Name', v:`${result.fileName}.${result.fileFormat}` },
                        { l:'Total Videos', v: result.videoCount },
                        { l:'File Size', v: result.fileSize },
                        { l:'Export Format', v: result.fileFormat.toUpperCase() },
                      ].map(s => (
                        <div key={s.l} className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.l}</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.v}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={reset}
                      className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.99] transition-all cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #e0354c 0%, #c41e3a 100%)' }}
                    >
                      <RefreshCw className="w-4 h-4" /> Extract Another
                    </button>
                  </div>
                  {result.rows.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                      <p className="text-sm text-gray-500">Data preview available for <strong>JSON</strong> format only. Your <strong>{result.fileFormat.toUpperCase()}</strong> file downloaded.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: info panel */}
            <div className="xl:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Top Illustration (matching Design Image 1) */}
                <div className="relative h-44 bg-gradient-to-b from-[#fff1f3] via-[#ffe6ea] to-[#fff4f6] flex items-center justify-center border-b border-red-100/50 overflow-hidden">
                  {/* Subtle dot pattern background */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: 'radial-gradient(#f43f5e 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  {/* Top-left search tag */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-red-100 rounded-lg shadow-sm">
                    <Search className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[11px] font-semibold text-red-600 tracking-tight">agency growth tips</span>
                  </div>

                  {/* Floating decorative blush rectangles */}
                  <div className="absolute top-4 right-4 w-9 h-6 bg-red-200/40 rounded-md border border-red-200/50" />
                  <div className="absolute bottom-4 left-5 w-9 h-6 bg-red-200/40 rounded-md border border-red-200/50" />

                  {/* Soft circular aura in center */}
                  <div className="absolute w-32 h-32 rounded-full bg-white/70 blur-md pointer-events-none" />

                  {/* Center YouTube Play Button */}
                  <div className="relative z-10 w-14 h-11 bg-gradient-to-br from-[#e11d48] to-[#be123c] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25 transition-transform duration-200 hover:scale-105">
                    <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                  </div>
                </div>

                {/* Card Content (Content from Image 2, Layout from Image 1) */}
                <div className="p-6">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    WHAT YOU'LL GET
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 font-['Space_Grotesk',sans-serif] mb-4">
                    Video stats that matter.
                  </h3>

                  <div className="divide-y divide-gray-100">
                    {[
                      {
                        title: 'Video details',
                        desc: 'Video title, URL, thumbnail, duration',
                        icon: Video,
                        bg: 'bg-blue-50 text-blue-600',
                      },
                      {
                        title: 'Engagement metrics',
                        desc: 'Views, likes, comments, publish date',
                        icon: BarChart2,
                        bg: 'bg-indigo-50 text-indigo-600',
                      },
                      {
                        title: 'Channel details',
                        desc: 'Channel name, subscribers, description, links',
                        icon: Tv,
                        bg: 'bg-purple-50 text-purple-600',
                      },
                      {
                        title: 'Live view count',
                        desc: 'View count at scrape time',
                        icon: Eye,
                        bg: 'bg-rose-50 text-rose-600',
                      },
                      {
                        title: 'Upload timestamps',
                        desc: 'Original upload date',
                        icon: Clock,
                        bg: 'bg-amber-50 text-amber-600',
                      },
                      {
                        title: 'Direct video links',
                        desc: 'Direct video links ready for export',
                        icon: ExternalLink,
                        bg: 'bg-emerald-50 text-emerald-600',
                      },
                    ].map(({ title, desc, icon: Icon, bg }) => (
                      <div key={title} className="flex items-start gap-3.5 py-3.5 first:pt-2 last:pb-0">
                        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-semibold text-gray-900 leading-tight">{title}</h4>
                          <p className="text-xs text-gray-500 mt-1 leading-normal">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Supported URL types */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3.5">Supported URL types</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Channel URL', example: 'youtube.com/@channel' },
                    { label: 'Playlist URL', example: 'youtube.com/playlist?list=…' },
                    { label: 'Search keyword', example: '"AI tutorials 2024"' },
                    { label: 'Single video', example: 'youtube.com/watch?v=…' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-8">Scrapify — clean data, three clicks away.</p>
        </div>
      </TrialGate>
    </AppShell>
  );
}
