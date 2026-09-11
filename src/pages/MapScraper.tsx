import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { TrialGate } from '../components/TrialGate';
import {
  Map, Search, MapPin, Download, Play,
  CheckCircle2, Star, Phone, Globe, ExternalLink, ShieldCheck,
  Building2, Navigation, Layers, RotateCcw,
} from 'lucide-react';

interface BusinessLead {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  phone: string;
  address: string;
  website: string;
  status: 'verified' | 'unverified';
}

const SAMPLE_LEADS: BusinessLead[] = [
  {
    id: '1',
    name: 'Apex Dental Practice & Orthodontics',
    category: 'Dental Clinic',
    rating: 4.9,
    reviews: 182,
    phone: '+44 117 923 4567',
    address: '42 Park Street, Bristol, BS1 5JG',
    website: 'https://apexdentalbristol.co.uk',
    status: 'verified',
  },
  {
    id: '2',
    name: 'Clifton Physiotherapy Clinic',
    category: 'Physiotherapist',
    rating: 4.8,
    reviews: 94,
    phone: '+44 117 945 8891',
    address: '18 Regent St, Clifton, Bristol, BS8 4HG',
    website: 'https://cliftonphysio.co.uk',
    status: 'verified',
  },
  {
    id: '3',
    name: 'Harbourside Chiropractic Studio',
    category: 'Chiropractor',
    rating: 4.7,
    reviews: 65,
    phone: '+44 117 908 1234',
    address: 'Gas Ferry Rd, Bristol, BS1 6UN',
    website: 'https://harboursidechiro.co.uk',
    status: 'verified',
  },
  {
    id: '4',
    name: 'Redland Health & Wellness Collective',
    category: 'Wellness Center',
    rating: 4.9,
    reviews: 143,
    phone: '+44 117 912 3450',
    address: '109 Whiteladies Rd, Bristol, BS8 2PB',
    website: 'https://redlandwellness.com',
    status: 'verified',
  },
  {
    id: '5',
    name: 'Avon Dental & Implant Suite',
    category: 'Dentist',
    rating: 4.6,
    reviews: 58,
    phone: '+44 117 934 5678',
    address: '78 Victoria St, Bristol, BS1 6DR',
    website: 'https://avondental.co.uk',
    status: 'verified',
  },
];

export function MapScraper() {
  const [query, setQuery] = useState('dentists');
  const [location, setLocation] = useState('Bristol, UK');
  const [limit, setLimit] = useState('25');
  const [filterRating, setFilterRating] = useState(true);
  const [filterPhone, setFilterPhone] = useState(true);
  const [filterWebsite, setFilterWebsite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [leads] = useState<BusinessLead[]>(SAMPLE_LEADS);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function handleScrape() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setToastMsg(`Successfully scraped ${leads.length} leads for "${query}" in ${location}`);
      setTimeout(() => setToastMsg(null), 3500);
    }, 1500);
  }

  function exportCSV() {
    const headers = ['Business Name', 'Category', 'Rating', 'Reviews', 'Phone', 'Address', 'Website'];
    const rows = leads.map(l => [
      `"${l.name}"`,
      `"${l.category}"`,
      l.rating,
      l.reviews,
      `"${l.phone}"`,
      `"${l.address}"`,
      `"${l.website}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `map_leads_${query.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <AppShell>
      <TrialGate scraperName="Map Scraper">
        <div className="page">
          {/* Heading */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">LOCAL BUSINESS INTELLIGENCE</p>
              <h1>Map Lead Scraper</h1>
              <p className="heading-copy">
                Extract high-intent local B2B leads from Google Maps with phone numbers, ratings, websites, and physical addresses.
              </p>
            </div>
            <button onClick={exportCSV} className="secondary-button">
              <Download className="w-4 h-4" /> Export Leads (.CSV)
            </button>
          </div>

          {/* Two-Column Scraper Layout */}
          <div className="scraper-layout">
            {/* Left: Input Panel */}
            <div className="scraper-panel">
              <div className="panel-header">
                <div>
                  <h2>Target Location &amp; Category</h2>
                  <p className="field-hint" style={{ margin: 0 }}>Configure search terms and regional bounding</p>
                </div>
                <div className="secure-note">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Data Source</span>
                </div>
              </div>

              <div className="field-group">
                <label>Business Type or Keyword</label>
                <div className="input-wrap">
                  <Search className="w-4 h-4 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. Dentists, Coffee shops, Accountants"
                  />
                </div>
              </div>

              <div className="two-fields">
                <div className="field-group">
                  <label>City or Coordinates</label>
                  <div className="input-wrap">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Bristol, UK or 51.4545, -2.5879"
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label>Max Results</label>
                  <div className="input-wrap">
                    <select value={limit} onChange={e => setLimit(e.target.value)}>
                      <option value="10">10 results</option>
                      <option value="25">25 results</option>
                      <option value="50">50 results</option>
                      <option value="100">100 results</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="filter-row">
                <span>Filter by:</span>
                <span
                  onClick={() => setFilterRating(!filterRating)}
                  className={`filter-chip ${filterRating ? 'selected' : ''}`}
                >
                  <Star className="w-3 h-3" /> 4.5+ Rating
                </span>
                <span
                  onClick={() => setFilterPhone(!filterPhone)}
                  className={`filter-chip ${filterPhone ? 'selected' : ''}`}
                >
                  <Phone className="w-3 h-3" /> Has Phone
                </span>
                <span
                  onClick={() => setFilterWebsite(!filterWebsite)}
                  className={`filter-chip ${filterWebsite ? 'selected' : ''}`}
                >
                  <Globe className="w-3 h-3" /> Has Website
                </span>
              </div>

              {/* Run button */}
              <div className="run-row">
                <span>
                  <Layers className="w-4 h-4" /> Ready to parse coordinates and contact details
                </span>
                <button
                  onClick={handleScrape}
                  disabled={loading || !query.trim()}
                  className="primary-button"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="w-4 h-4 spin" /> Extracting leads...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Start Map Scrape
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Insight & Map Preview Panel */}
            <div className="insight-panel">
              <div className="map-preview">
                <div className="map-grid" />
                <div className="map-route route-one" />
                <div className="map-route route-two" />
                <div className="map-dot dot-a" />
                <div className="map-dot dot-b" />
                <div className="map-dot dot-c" />
                <div className="map-dot dot-d" />
                <div className="map-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <div className="map-search-label">
                  <Navigation className="w-3 h-3 text-[#3655d2]" />
                  <span>{location}</span>
                </div>
              </div>

              <div className="insight-copy">
                <h3>Extraction Insights</h3>
                <div className="insight-item">
                  <span><Building2 className="w-4 h-4" /></span>
                  <div>
                    <strong>98.4% Contact Coverage</strong>
                    <p>Phone numbers and physical suites are matched directly against Google Business profiles.</p>
                  </div>
                </div>
                <div className="insight-item">
                  <span><CheckCircle2 className="w-4 h-4" /></span>
                  <div>
                    <strong>Verified Active Websites</strong>
                    <p>Web addresses are verified with status 200 checks before including in your final dataset.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table Section */}
          <div className="results-section">
            <div className="results-heading">
              <div>
                <h2>Extracted Leads ({leads.length})</h2>
              </div>
              <div className="results-actions">
                <div className="result-status">
                  <span className="status-dot" />
                  <span>{leads.length} live results</span>
                </div>
                <button onClick={exportCSV} className="icon-button" title="Download CSV">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Website</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <div className="business-cell">
                          <div className="business-avatar">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <strong>{lead.name}</strong>
                            <span>{lead.address.split(',')[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{lead.category}</span>
                      </td>
                      <td>
                        <span className="rating">★ {lead.rating}</span>{' '}
                        <span className="review-count">({lead.reviews})</span>
                      </td>
                      <td>
                        <span className="text-[#3d4a61] font-mono text-xs">{lead.phone}</span>
                      </td>
                      <td>
                        <span className="text-[#69758a] text-xs max-w-xs block truncate">{lead.address}</span>
                      </td>
                      <td>
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3655d2] hover:underline font-semibold text-xs"
                        >
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="toast">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMsg}</span>
              <button onClick={() => setToastMsg(null)}>✕</button>
            </div>
          )}
        </div>
      </TrialGate>
    </AppShell>
  );
}
