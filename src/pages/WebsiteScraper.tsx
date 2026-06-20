import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from '@google/genai';
import {
  MapPin, Search, Loader2, ExternalLink, Navigation, Download, Trash2,
  RefreshCw, Lightbulb, Sparkles, Check, Clipboard, FileSpreadsheet,
  AlertCircle, X, ArrowLeft, Key, Eye, EyeOff, CheckCircle,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function robustParseJSON(text: string): any[] {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const results: any[] = [];
  let braceCount = 0, inString = false, escapeNext = false, start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (c === '\\' && inString) { escapeNext = true; continue; }
    if (c === '"' && !escapeNext) { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') { if (braceCount === 0) start = i; braceCount++; }
      else if (c === '}') {
        braceCount--;
        if (braceCount === 0 && start !== -1) {
          try { results.push(JSON.parse(text.substring(start, i + 1))); }
          catch { try { results.push(JSON.parse(text.substring(start, i + 1).replace(/,\s*([}\]])/g, '$1'))); } catch {} }
          start = -1;
        }
      }
    }
  }
  return results;
}

// ── Gemini API helpers ────────────────────────────────────────────────────────
const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash — Recommended' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite — Most Free Quota (1000/day)' },
  { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro — Highest Quality' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
];

async function callGemini(apiKey: string, model: string, prompt: string, useSearch = true): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const config: any = useSearch ? { tools: [{ googleSearch: {} }] } : {};
  let attempt = 0;
  while (true) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt, config });
      return response.text || '';
    } catch (err: any) {
      attempt++;
      const msg = String(err?.message || err);
      const is429 = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (is429 && attempt <= 4) { await sleep(5000 * Math.pow(2, attempt - 1)); continue; }
      throw err;
    }
  }
}

// Phase 1: Deep discovery — find businesses AND fully enrich them in ONE call
async function searchPlacesGemini(apiKey: string, model: string, query: string, limit: string) {
  const limitStr = limit === 'All' ? 'at least 15–20' : `exactly ${limit}`;
  const prompt = `You are a professional B2B lead researcher with access to Google Search.

TASK: Find ${limitStr} real businesses matching: "${query}"

For EVERY business you find, you MUST perform deep research using Google Search to find:
1. Full registered business name
2. Complete street address (number, street, city, postcode/zip, country)
3. Direct phone number (include country code)
4. Contact email — search the company website, LinkedIn, Companies House, Justdial, Sulekha, IndiaMART, Yelp, Google Business, or any directory. Try formats like info@, contact@, hello@, admin@, [name]@company.com
5. Official website URL (full https:// URL)
6. Key contact person — search LinkedIn for "Director", "Owner", "Founder", "Managing Director", "CEO", "Partner" at this company. Include their full name.
7. Job title of the contact person
8. LinkedIn profile URL of the contact person (if found)
9. Business category / industry type
10. Approximate number of employees (if findable)

SEARCH STRATEGY:
- Search "[business name] contact email"
- Search "[business name] [city] director linkedin"
- Search "[business name] [postcode/area] phone number"
- Check the company's own website for a "Contact Us" or "About Us" page
- Check Google Maps listing for phone and website
- Check Companies House (UK), MCA India, or relevant business registry

CRITICAL OUTPUT RULES:
- Return a JSON array wrapped in \`\`\`json ... \`\`\` tags
- Each object MUST have these exact keys: "name", "address", "phone", "email", "website", "contact_person", "job_title", "linkedin_url", "business_type", "employees"
- Use "N/A" only if genuinely impossible to find after thorough search
- Do NOT fabricate data — only include verified information
- Every "N/A" represents a missed opportunity — search harder before giving up

After the JSON, if you found fewer than requested, add "### Recommendations & Broader Queries" with specific suggestions.`;

  const text = await callGemini(apiKey, model, prompt, true);
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  const extractedData = match ? robustParseJSON(match[1]) : robustParseJSON(text);
  const cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();
  return { text: cleanText, extractedData };
}

// Phase 2 (single lead): Ultra-deep enrichment for one specific business
async function enrichLeadGemini(apiKey: string, model: string, name: string, address: string) {
  const prompt = `You are an expert B2B researcher. Perform deep Google Search investigation for this specific business:

Business: "${name}"
Address: "${address}"

REQUIRED - Search ALL of these sources:
1. The company's official website — look at /contact, /about, /team pages
2. Google Maps listing for this business
3. LinkedIn company page — search "site:linkedin.com/company ${name}"
4. LinkedIn people — search "site:linkedin.com/in director OR owner OR CEO '${name}'"
5. Companies House (UK) / MCA (India) / relevant national registry
6. Local business directories: Yelp, Yell.com, Justdial, Sulekha, Trustpilot, Clutch
7. Press releases, news articles mentioning this business
8. Facebook/Instagram business page

Extract and return:
- email: Direct contact email (not a form, an actual email address)
- website: Full website URL with https://
- contact_person: Full name of owner/director/CEO/founder
- job_title: Their exact job title
- linkedin_url: Their LinkedIn profile URL
- phone: Direct phone number with country code
- business_type: Industry/category
- employees: Approximate staff count

Return ONLY a JSON object in \`\`\`json ... \`\`\` tags with these exact keys.
Use "N/A" only if completely unfindable after exhaustive search.`;

  const text = await callGemini(apiKey, model, prompt, true);
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) { try { return JSON.parse(match[1].trim()); } catch {} }
  const parsed = robustParseJSON(text);
  return parsed[0] || { email: 'N/A', website: 'N/A', contact_person: 'N/A', job_title: 'N/A', linkedin_url: 'N/A', phone: 'N/A', business_type: 'N/A', employees: 'N/A' };
}

// Phase 2 (batch): Deep enrichment for multiple leads
async function enrichBatchGemini(apiKey: string, model: string, leads: { name: string; address: string }[]) {
  const prompt = `You are an expert B2B lead researcher. For each of these ${leads.length} businesses, perform deep Google Search to find their contact details.

For EACH business, search:
- Their official website contact/about/team pages
- Google Maps listing
- LinkedIn (company page + key people: Director, Owner, CEO, Founder)
- Business directories (Yelp, Justdial, Yell, Companies House, MCA)
- Any press releases or news articles

Businesses to research:
${JSON.stringify(leads, null, 2)}

Return a JSON array in \`\`\`json ... \`\`\` tags with exactly ${leads.length} objects in the SAME ORDER.
Each object must have: "name", "email", "website", "contact_person", "job_title", "linkedin_url", "phone", "business_type", "employees"
Use "N/A" only after genuinely exhaustive searching. Do not fabricate.`;

  const text = await callGemini(apiKey, model, prompt, true);
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) { const p = robustParseJSON(match[1]); if (p.length) return p; }
  return robustParseJSON(text);
}

// ── Main Component ────────────────────────────────────────────────────────────
export function WebsiteScraper() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // API Key
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyEntered, setApiKeyEntered] = useState(() => !!localStorage.getItem('gemini_api_key'));
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.5-flash');

  // Search state — add live progress message
  const [searchProgress, setSearchProgress] = useState<string>('');

  // Search
  const [query, setQuery] = useState('accountants in London, UK');
  const [limit, setLimit] = useState('10');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaLimited, setIsQuotaLimited] = useState(false);

  // Data
  const [extractedData, setExtractedData] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('wsLeadsData') || '[]'); } catch { return []; }
  });
  const [accumulate, setAccumulate] = useState(true);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [searchStats, setSearchStats] = useState<{ newAdded: number; skipped: number } | null>(null);
  const [showStatsToast, setShowStatsToast] = useState(false);

  // Location error message
  const [locationError, setLocationError] = useState<string | null>(null);

  // Enrichment
  const [enrichingMap, setEnrichingMap] = useState<Record<string, boolean>>({});
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [enrichmentPauseTimer, setEnrichmentPauseTimer] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem('wsLeadsData', JSON.stringify(extractedData)); } catch {}
  }, [extractedData]);

  useEffect(() => {
    if (extractedData.length > 0) setSelectedNames(new Set(extractedData.map(i => i.name)));
    else setSelectedNames(new Set());
  }, [extractedData]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        err => { console.warn(err); setLocationError('Could not get your location.'); }
      );
    }
  }, []);

  function saveApiKey() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    localStorage.setItem('gemini_api_key', trimmed);
    localStorage.setItem('gemini_model', selectedModel);
    setApiKey(trimmed);
    setApiKeyEntered(true);
  }

  function clearApiKey() {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setApiKeyEntered(false);
  }

  function isDuplicate(updated: any[], entry: any): boolean {
    const eName = (entry.name || '').trim().toLowerCase();
    const eWeb = (entry.website || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    const ePhone = (entry.phone || '').trim().replace(/\s+/g, '');
    return updated.some(ex => {
      const xName = (ex.name || '').trim().toLowerCase();
      const xWeb = (ex.website || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
      const xPhone = (ex.phone || '').trim().replace(/\s+/g, '');
      if (eName && xName && eName === xName) return true;
      if (eWeb && xWeb && eWeb !== 'n/a' && eWeb === xWeb) return true;
      if (ePhone && xPhone && ePhone !== 'n/a' && ePhone === xPhone) return true;
      return false;
    });
  }

  function mergeData(incoming: any[]): { newAdded: number; skipped: number } {
    let newAdded = 0, skipped = 0;
    if (accumulate) {
      setExtractedData(prev => {
        const updated = [...prev];
        incoming.forEach(entry => {
          if (isDuplicate(updated, entry)) { skipped++; }
          else { updated.push(entry); newAdded++; }
        });
        return updated;
      });
    } else {
      setExtractedData(incoming);
      newAdded = incoming.length;
    }
    return { newAdded, skipped };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !apiKey) return;
    setLoading(true);
    setError(null);
    setIsQuotaLimited(false);
    setSearchStats(null);
    setShowStatsToast(false);
    setSearchProgress('🔍 Searching Google for matching businesses...');
    try {
      setSearchProgress('🌐 AI is researching businesses, websites, contacts & emails...');
      const res = await searchPlacesGemini(apiKey, selectedModel, query, limit);
      setSearchProgress('✅ Processing results...');
      setResult({ text: res.text });
      const stats = mergeData(res.extractedData || []);
      setSearchStats(stats);
      setShowStatsToast(true);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
        setIsQuotaLimited(true);
        setError('API rate limit reached. Please wait 30–60 seconds and try again, or reduce the target count to 5.');
      } else {
        setError(err?.message || 'An error occurred while searching.');
      }
    } finally {
      setLoading(false);
      setSearchProgress('');
    }
  }

  function handleClear() {
    setExtractedData([]);
    setResult(null);
    setSearchStats(null);
    setShowStatsToast(false);
    localStorage.removeItem('wsLeadsData');
  }

  const toggleRow = (name: string) => {
    const s = new Set(selectedNames);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelectedNames(s);
  };

  const toggleAll = (visible: any[]) => {
    const allSel = visible.every(i => selectedNames.has(i.name));
    const s = new Set(selectedNames);
    if (allSel) visible.forEach(i => s.delete(i.name));
    else visible.forEach(i => s.add(i.name));
    setSelectedNames(s);
  };

  async function handleEnrichLead(name: string, address: string) {
    if (enrichingMap[name] || !apiKey) return;
    setEnrichingMap(prev => ({ ...prev, [name]: true }));
    try {
      const d = await enrichLeadGemini(apiKey, selectedModel, name, address);
      setExtractedData(prev => prev.map(row =>
        row.name === name ? {
          ...row,
          email:          d.email          && d.email          !== 'N/A' ? d.email          : row.email,
          website:        d.website        && d.website        !== 'N/A' ? d.website        : row.website,
          contact_person: d.contact_person && d.contact_person !== 'N/A' ? d.contact_person : row.contact_person,
          job_title:      d.job_title      && d.job_title      !== 'N/A' ? d.job_title      : row.job_title,
          linkedin_url:   d.linkedin_url   && d.linkedin_url   !== 'N/A' ? d.linkedin_url   : row.linkedin_url,
          phone:          d.phone          && d.phone          !== 'N/A' ? d.phone          : row.phone,
          business_type:  d.business_type  && d.business_type  !== 'N/A' ? d.business_type  : row.business_type,
          employees:      d.employees      && d.employees      !== 'N/A' ? d.employees      : row.employees,
        } : row
      ));
    } catch (err: any) {
      alert('Could not enrich lead: ' + err.message);
    } finally {
      setEnrichingMap(prev => ({ ...prev, [name]: false }));
    }
  }

  async function handleEnrichAllSelected() {
    if (!apiKey) return;
    const needsFields = (row: any) =>
      ['email','website','contact_person','job_title','linkedin_url'].some(k => !row[k] || row[k] === 'N/A');
    const toEnrich = extractedData.filter(row => selectedNames.has(row.name) && needsFields(row));
    if (toEnrich.length === 0) { alert('All selected leads are already fully enriched!'); return; }
    setEnrichingAll(true);
    setBatchProgress({ current: 0, total: toEnrich.length });
    const chunkSize = 4;
    for (let i = 0; i < toEnrich.length; i += chunkSize) {
      const chunk = toEnrich.slice(i, i + chunkSize);
      setEnrichingMap(prev => { const n = { ...prev }; chunk.forEach(r => { n[r.name] = true; }); return n; });
      setBatchProgress({ current: Math.min(i + chunkSize, toEnrich.length), total: toEnrich.length });
      if (i > 0) await sleep(4000);
      let success = false, attempts = 0;
      while (!success && attempts < 2) {
        try {
          const results = await enrichBatchGemini(apiKey, selectedModel, chunk.map(r => ({ name: r.name, address: r.address || '' })));
          setExtractedData(prev => prev.map(item => {
            const d = results?.find((r: any) => r?.name?.toLowerCase().trim() === item.name.toLowerCase().trim());
            if (!d) return item;
            return {
              ...item,
              email:          d.email          && d.email          !== 'N/A' ? d.email          : item.email,
              website:        d.website        && d.website        !== 'N/A' ? d.website        : item.website,
              contact_person: d.contact_person && d.contact_person !== 'N/A' ? d.contact_person : item.contact_person,
              job_title:      d.job_title      && d.job_title      !== 'N/A' ? d.job_title      : item.job_title,
              linkedin_url:   d.linkedin_url   && d.linkedin_url   !== 'N/A' ? d.linkedin_url   : item.linkedin_url,
              phone:          d.phone          && d.phone          !== 'N/A' ? d.phone          : item.phone,
              business_type:  d.business_type  && d.business_type  !== 'N/A' ? d.business_type  : item.business_type,
              employees:      d.employees      && d.employees      !== 'N/A' ? d.employees      : item.employees,
            };
          }));
          success = true;
        } catch (err: any) {
          attempts++;
          const is429 = String(err?.message || '').includes('429');
          if (is429 && attempts < 2) {
            for (let sec = 20; sec > 0; sec--) { setEnrichmentPauseTimer(sec); await sleep(1000); }
            setEnrichmentPauseTimer(null);
          } else break;
        }
      }
      setEnrichingMap(prev => { const n = { ...prev }; chunk.forEach(r => { n[r.name] = false; }); return n; });
    }
    setEnrichingAll(false);
    setBatchProgress(null);
    setEnrichmentPauseTimer(null);
  }

  const filteredData = extractedData.filter(row => {
    const term = tableFilter.toLowerCase();
    return ['name', 'contact_person', 'job_title', 'phone', 'email', 'website', 'address', 'business_type', 'employees'].some(k =>
      (row[k] || '').toLowerCase().includes(term)
    );
  });

  const aiRecommendations = (() => {
    if (!result?.text) return null;
    const idx = result.text.indexOf('### Recommendations & Broader Queries');
    return idx !== -1 ? result.text.substring(idx + '### Recommendations & Broader Queries'.length).trim() : null;
  })();

  const isLimitHigherThanFound = !loading && (() => {
    const n = parseInt(limit, 10);
    return !isNaN(n) && extractedData.length > 0 && extractedData.length < n;
  })();

  function getDynamicAdvice() {
    const q = query.trim();
    if (!q) return { keyword: 'business', location: 'London', broadKeywords: ['IT consultants London'], postcodes: ['City of London', 'Canary Wharf'] };
    const inMatch = q.match(/(.+)\s+in\s+([A-Za-z0-9\s,#\-\.]+)/i);
    const nearMatch = q.match(/(.+)\s+near\s+([A-Za-z0-9\s,#\-\.]+)/i);
    let keyword = q, location = '';
    if (inMatch) { keyword = inMatch[1].trim(); location = inMatch[2].trim(); }
    else if (nearMatch) { keyword = nearMatch[1].trim(); location = nearMatch[2].trim(); }
    const kLwr = keyword.toLowerCase();
    const locLwr = location.toLowerCase();
    let broadKeywords = [`${keyword} services ${location}`, `${keyword} companies ${location}`, `${keyword} professionals ${location}`];
    if (kLwr.includes('account') || kLwr.includes('finance')) broadKeywords = [`chartered accountants ${location}`, `tax advisors ${location}`, `bookkeepers ${location}`];
    else if (kLwr.includes('restaurant') || kLwr.includes('food')) broadKeywords = [`cafes ${location}`, `takeaways ${location}`, `restaurants near ${location}`];
    else if (kLwr.includes('builder') || kLwr.includes('construct')) broadKeywords = [`builders ${location}`, `contractors ${location}`, `architects ${location}`];
    let postcodes = [`North ${location}`, `South ${location}`, `East ${location}`, `${location} suburbs`];
    if (locLwr.includes('london')) postcodes = ['Westminster', 'Kensington', 'Canary Wharf', 'Shoreditch'];
    else if (locLwr.includes('manchester')) postcodes = ['Salford', 'Trafford', 'Didsbury', 'Stockport'];
    else if (locLwr.includes('birmingham')) postcodes = ['Solihull', 'Sutton Coldfield', 'Edgbaston', 'Digbeth'];
    else if (locLwr.includes('reading')) postcodes = ['RG1', 'RG2', 'RG4', 'Caversham'];
    else if (locLwr.includes('vadodara') || locLwr.includes('baroda')) postcodes = ['Alkapuri', 'Akota', 'Gotri', 'Manjalpur'];
    else if (locLwr.includes('mumbai') || locLwr.includes('bombay')) postcodes = ['Andheri', 'Bandra', 'BKC', 'Thane'];
    return { keyword, location: location || 'your area', broadKeywords, postcodes };
  }
  const advice = getDynamicAdvice();

  function exportToCSV() {
    if (!selectedNames.size) return;
    const headers = ['Row #', 'Company Name', 'Business Type', 'Employees', 'Contact Person', 'Job Title', 'Phone', 'Email', 'Website Address', 'LinkedIn Profile', 'Street Address', 'Google Maps Verification Link'];
    const rows = [headers.join(',')];
    extractedData.filter(r => selectedNames.has(r.name)).forEach((row, i) => {
      const q = (v: string) => `"${(v || 'N/A').replace(/"/g, '""')}"`;
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((row.name || '') + ' ' + (row.address || ''))}`;
      rows.push([
        `"${i + 1}"`, q(row.name), q(row.business_type), q(row.employees),
        q(row.contact_person), q(row.job_title), q(row.phone), q(row.email),
        q(row.website), q(row.linkedin_url), q(row.address), `"${mapsLink}"`
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leads_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopyClipboard() {
    const active = extractedData.filter(i => selectedNames.has(i.name));
    if (!active.length) return;
    const header = 'Name\tBusiness Type\tEmployees\tContact Person\tJob Title\tPhone\tEmail\tWebsite\tLinkedIn\tAddress\n';
    const body = active.map(r =>
      `${r.name||'N/A'}\t${r.business_type||'N/A'}\t${r.employees||'N/A'}\t${r.contact_person||'N/A'}\t${r.job_title||'N/A'}\t${r.phone||'N/A'}\t${r.email||'N/A'}\t${r.website||'N/A'}\t${r.linkedin_url||'N/A'}\t${r.address||'N/A'}`
    ).join('\n');
    navigator.clipboard.writeText(header + body);
    alert(`Copied ${active.length} records to clipboard! Ready to paste into Excel or Google Sheets.`);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </button>
            <img src="/scrapify.png" alt="Scrapify" className="h-12 w-auto object-contain" />
            <button onClick={() => signOut().then(() => navigate('/'))} className="text-gray-600 hover:text-red-600 transition-colors font-medium">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-white" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-white/20 text-white rounded uppercase">Excel Ready</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-white/20 text-white rounded uppercase">AI-Powered</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Lead Extractor — Website Scraper</h1>
                <p className="text-green-100 text-sm mt-1">Search businesses by name & location · Extracts contacts, emails · Export to Excel CSV</p>
              </div>
            </div>
          </div>

          {/* API Key Setup */}
          <div className="px-8 py-5 border-b border-gray-100">
            {!apiKeyEntered ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">Gemini API Key Required</p>
                    <p className="text-xs text-amber-600">Get a free key at{' '}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-800">
                        aistudio.google.com/apikey
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveApiKey()}
                      placeholder="Paste your Gemini API key here..."
                      className="w-full border border-amber-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 pr-10 font-mono bg-white"
                    />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                    className="border border-amber-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-700 font-medium">
                    {GEMINI_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button onClick={saveApiKey} disabled={!apiKey.trim()}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg transition-all text-sm whitespace-nowrap">
                    Save Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="font-semibold">API Key active</span>
                  <span className="text-green-500 font-mono text-xs">{apiKey.substring(0, 8)}••••••••</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Model:</span>
                  <select value={selectedModel} onChange={e => { setSelectedModel(e.target.value); localStorage.setItem('gemini_model', e.target.value); }}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 font-medium">
                    {GEMINI_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button onClick={clearApiKey} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 ml-1">
                    <X className="w-3 h-3" /> Change Key
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Form */}
          <div id="search-section" className="px-8 py-6 space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. accountants in London, UK  or  restaurants near Manchester"
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
                <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center border border-gray-300 rounded-xl px-4 bg-white focus-within:ring-2 focus-within:ring-green-500">
                    <span className="text-xs text-gray-500 mr-2 font-semibold whitespace-nowrap">Target:</span>
                    <select value={limit} onChange={e => setLimit(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-gray-800 py-3.5 pr-1 cursor-pointer font-semibold text-sm">
                      <option value="5">5 leads</option>
                      <option value="10">10 leads</option>
                      <option value="20">20 leads</option>
                      <option value="50">50 leads</option>
                      <option value="All">All possible</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loading || !query.trim() || !apiKeyEntered}
                    className="px-8 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 min-w-[150px] justify-center">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Searching...' : 'Find Leads'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" checked={accumulate} onChange={e => setAccumulate(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Accumulate into master list</span>
                  </label>
                  {extractedData.length > 0 && (
                    <button type="button" onClick={handleClear}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-red-500 hover:border-red-500 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" /> Reset List
                    </button>
                  )}
                </div>
                {locationError && (
                  <p className="text-amber-600 text-xs flex items-center gap-1"><Navigation className="w-3 h-3" />{locationError}</p>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Live search progress */}
        {loading && searchProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">{searchProgress}</p>
              <p className="text-xs text-blue-500 mt-0.5">AI is performing deep multi-source research — this may take 20–60 seconds for thorough results</p>
            </div>
          </div>
        )}

        {/* Stats Toast */}
        {showStatsToast && searchStats && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between text-sm text-green-800">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span><strong>Search complete:</strong> Added <strong>{searchStats.newAdded}</strong> new records. Skipped <strong>{searchStats.skipped}</strong> duplicates.</span>
            </div>
            <button onClick={() => setShowStatsToast(false)} className="text-xs text-green-600 hover:text-green-800 font-bold uppercase">Dismiss</button>
          </div>
        )}

        {/* Error / Quota Banner */}
        {(error || isQuotaLimited) && (
          <div className={`rounded-xl p-5 flex items-start gap-3 border ${isQuotaLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isQuotaLimited ? 'text-amber-500' : 'text-red-500'}`} />
            <div>
              <p className={`font-bold text-sm ${isQuotaLimited ? 'text-amber-800' : 'text-red-800'}`}>
                {isQuotaLimited ? 'Gemini API Rate Limit (429)' : 'Search Error'}
              </p>
              <p className={`text-sm mt-0.5 ${isQuotaLimited ? 'text-amber-700' : 'text-red-700'}`}>{error}</p>
              {isQuotaLimited && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  💡 Tips: Reduce target count to 5–10, wait 30s, then retry. Or enable "Accumulate" and run multiple small searches.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Enrichment Progress */}
        {enrichingAll && batchProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {enrichmentPauseTimer
                ? <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                : <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              <div>
                <p className="font-semibold text-blue-900 text-sm">
                  {enrichmentPauseTimer ? `Rate limit cooldown — resuming in ${enrichmentPauseTimer}s...` : 'AI Deep Research Running...'}
                </p>
                <p className="text-xs text-blue-600">{batchProgress.current} of {batchProgress.total} leads processed</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              {Math.round((batchProgress.current / batchProgress.total) * 100)}%
            </span>
          </div>
        )}

        {/* Suggestions */}
        {(isLimitHigherThanFound || aiRecommendations) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <h4 className="font-bold text-amber-800">Not enough results? Try these:</h4>
              {isLimitHigherThanFound && <span className="text-xs text-amber-600">(Requested {limit}, found {extractedData.length})</span>}
            </div>
            {aiRecommendations ? (
              <div className="bg-white p-4 rounded-lg border border-amber-100 text-gray-700 text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{aiRecommendations}</ReactMarkdown>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-700 block mb-2">Broader keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {advice.broadKeywords.map((bk, i) => (
                      <button key={i} type="button" onClick={() => setQuery(bk)}
                        className="bg-gray-50 hover:bg-green-600 hover:text-white border border-gray-200 hover:border-green-600 text-gray-700 px-2 py-1 rounded-lg font-mono transition-all">
                        "{bk}"
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-700 block mb-2">Try nearby areas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {advice.postcodes.map((pc, i) => (
                      <button key={i} type="button" onClick={() => setQuery(`${advice.keyword} in ${pc}`)}
                        className="bg-gray-50 hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 text-gray-700 px-2 py-1 rounded-lg font-mono transition-all">
                        {pc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leads Table */}
        {extractedData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Table Toolbar */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <h3 className="text-base font-bold text-gray-900">Leads Spreadsheet</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{filteredData.length} of {extractedData.length} records · Zero duplicates</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={tableFilter} onChange={e => setTableFilter(e.target.value)} placeholder="Filter rows..."
                    className="w-full pl-8 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleCopyClipboard} disabled={!selectedNames.size}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 disabled:opacity-40 rounded-lg font-semibold text-xs text-gray-700 transition-all border border-gray-300">
                    <Clipboard className="w-3.5 h-3.5" />Copy ({selectedNames.size})
                  </button>
                  <button onClick={handleEnrichAllSelected} disabled={!selectedNames.size || enrichingAll || !apiKeyEntered}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg font-semibold text-xs text-white transition-all">
                    {enrichingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Enrich ({selectedNames.size})
                  </button>
                  <button onClick={exportToCSV} disabled={!selectedNames.size}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg font-semibold text-xs text-white transition-all shadow-sm active:scale-95">
                    <Download className="w-3.5 h-3.5" />Download CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="p-3 w-10 text-center border-r border-gray-200">
                        <input type="checkbox"
                          checked={filteredData.length > 0 && filteredData.every(i => selectedNames.has(i.name))}
                          onChange={() => toggleAll(filteredData)}
                          className="w-3.5 h-3.5 text-green-600 rounded border-gray-300 cursor-pointer" />
                      </th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 w-8 text-center">#</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[160px]">Company Name</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[110px]">Business Type</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[80px]">Employees</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[130px]">Contact Person</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[120px]">Job Title</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[120px]">Phone</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[180px]">Email</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[140px]">Website</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[100px]">LinkedIn</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[160px]">Address</th>
                      <th className="p-3 font-semibold text-gray-600 border-r border-gray-200 min-w-[80px]">Maps</th>
                      <th className="p-3 font-semibold text-gray-600 text-center min-w-[70px]">Enrich</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.length > 0 ? filteredData.map((row, i) => {
                      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((row.name || '') + ' ' + (row.address || ''))}`;
                      const isComplete = ['email','website','contact_person','job_title','linkedin_url'].every(k => row[k] && row[k] !== 'N/A');
                      const na = (v: string) => !v || v === 'N/A';
                      return (
                        <tr key={i} className={`hover:bg-green-50 transition-colors ${selectedNames.has(row.name) ? 'bg-green-50/40' : ''}`}>
                          <td className="p-3 text-center border-r border-gray-100">
                            <input type="checkbox" checked={selectedNames.has(row.name)} onChange={() => toggleRow(row.name)}
                              className="w-3.5 h-3.5 text-green-600 rounded border-gray-300 cursor-pointer" />
                          </td>
                          <td className="p-3 text-gray-400 font-mono text-center border-r border-gray-100 text-xs">{i + 1}</td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="font-semibold text-gray-900 text-xs leading-snug max-w-[155px] truncate" title={row.name}>{row.name}</div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            {na(row.business_type) ? <span className="text-gray-300 text-xs">N/A</span>
                              : <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium whitespace-nowrap">{row.business_type}</span>}
                          </td>
                          <td className="p-3 text-gray-600 border-r border-gray-100 text-xs text-center">
                            {na(row.employees) ? <span className="text-gray-300">N/A</span> : row.employees}
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="text-xs font-medium text-gray-800 truncate max-w-[125px]">{na(row.contact_person) ? <span className="text-gray-300">N/A</span> : row.contact_person}</div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="text-xs text-gray-500 truncate max-w-[115px] italic">{na(row.job_title) ? <span className="text-gray-300">N/A</span> : row.job_title}</div>
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-700 border-r border-gray-100 truncate">
                            {na(row.phone) ? <span className="text-gray-300">N/A</span>
                              : <a href={`tel:${row.phone}`} className="hover:text-green-600 hover:underline">{row.phone}</a>}
                          </td>
                          <td className="p-3 border-r border-gray-100 truncate max-w-[175px]">
                            {na(row.email) ? <span className="text-gray-300 text-xs">N/A</span>
                              : <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline font-mono text-xs">{row.email}</a>}
                          </td>
                          <td className="p-3 border-r border-gray-100 truncate max-w-[135px]">
                            {na(row.website) ? <span className="text-gray-300 text-xs">N/A</span> : (
                              <a href={row.website.startsWith('http') ? row.website : `https://${row.website}`} target="_blank" rel="noopener noreferrer"
                                className="text-green-600 hover:underline inline-flex items-center gap-1 text-xs font-medium">
                                {row.website.replace(/^(https?:\/\/)?(www\.)?/, '').substring(0, 18)}<ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            )}
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            {na(row.linkedin_url) ? <span className="text-gray-300 text-xs">N/A</span> : (
                              <a href={row.linkedin_url.startsWith('http') ? row.linkedin_url : `https://${row.linkedin_url}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 hover:underline text-xs font-medium inline-flex items-center gap-1">
                                <span>LinkedIn</span><ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="p-3 text-gray-500 border-r border-gray-100 text-xs truncate max-w-[155px]">{row.address || 'N/A'}</td>
                          <td className="p-3 border-r border-gray-100">
                            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap">
                              <MapPin className="w-3 h-3" />Map
                            </a>
                          </td>
                          <td className="p-3 text-center">
                            {enrichingMap[row.name] ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 text-[10px]"><Loader2 className="w-3 h-3 animate-spin" /></span>
                            ) : isComplete ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-bold text-[10px] bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                                <Check className="w-3 h-3" />Done
                              </span>
                            ) : (
                              <button onClick={() => handleEnrichLead(row.name, row.address || '')} disabled={!apiKeyEntered}
                                className="px-2 py-1 text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-all disabled:opacity-40 whitespace-nowrap">
                                + Enrich
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={14} className="p-10 text-center text-gray-400 text-sm">No results match your filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Sheet1</span>
                <span>Records: <strong className="text-gray-700">{filteredData.length}</strong></span>
                <span>Selected: <strong className="text-gray-700">{selectedNames.size}</strong></span>
              </div>
              <span className="text-[10px] font-medium text-gray-400">Excel / CSV Compatible</span>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {result && result.text && !aiRecommendations && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />AI Research Summary
            </h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{result.text}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && extractedData.length === 0 && apiKeyEntered && (
          <div className="text-center py-16 bg-white rounded-2xl shadow border border-gray-200">
            <FileSpreadsheet className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <p className="text-lg font-semibold text-gray-600">Your spreadsheet is empty</p>
            <p className="text-sm text-gray-400 mt-1">Type a business type and location above, then click <strong>Find Leads</strong></p>
            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>Example: <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">"accountants in London, UK"</span></p>
              <p>Example: <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">"restaurants near Manchester"</span></p>
              <p>Example: <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">"dentists in Vadodara, India"</span></p>
            </div>
          </div>
        )}

        {/* CSV Column Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-blue-900 mb-3 text-sm">What columns are exported to CSV?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Row #', 'Company Name', 'Business Type', 'Employees', 'Contact Person', 'Job Title', 'Phone', 'Email', 'Website Address', 'LinkedIn Profile URL', 'Street Address', 'Google Maps Verification Link'].map((col, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-blue-800">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>{col}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
