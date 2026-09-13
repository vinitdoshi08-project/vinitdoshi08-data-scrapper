import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  Youtube, Globe, Map, ArrowRight, Plus, AlertTriangle,
  Loader2, Check, Sparkles, Database, TrendingUp, X, Crown, Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppShell } from '../components/AppShell';

const UPGRADE_PLANS = [
  {
    id: 'basic' as const, name: 'Basic',
    monthly: { usd: 6,  label: '$6'  },
    yearly:  { usd: 5,  label: '$5', total: '$60/yr' },
    features: ['Unlimited scrapes', 'YouTube & Website scraper', 'Excel, PDF & JSON', 'Priority support', 'AI extraction'],
    highlight: true,
  },
  {
    id: 'standard' as const, name: 'Standard',
    monthly: { usd: 9, label: '$9' },
    yearly:  { usd: 8, label: '$8', total: '$96/yr' },
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

export function Dashboard() {
  const { user } = useAuth();
  const { plan, can_scrape, loading: subLoading, billing_cycle, refresh } = useSubscription() as any;
  const navigate = useNavigate();

  const [showUpgrade,   setShowUpgrade]   = useState(false);
  const [paying,        setPaying]        = useState<string | null>(null);
  const [upgradeMsg,    setUpgradeMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, setUsdToInr]                   = useState<number>(84);
  const [yearlyBilling, setYearlyBilling] = useState(false);

  useEffect(() => { fetchUsdToInrRate().then(setUsdToInr); }, []);

  const isExpired = !can_scrape && !subLoading;
  const isPaid = plan === 'basic' || plan === 'standard';
  const firstName = user?.full_name?.split(' ')[0] || 'Jordan';

  async function handlePay(p: typeof UPGRADE_PLANS[0]) {
    // If active on yearly plan, user cannot switch to monthly
    if (isPaid && !isExpired && billing_cycle === 'yearly' && !yearlyBilling) {
      setUpgradeMsg({
        type: 'error',
        text: 'Your account is on an active Yearly plan. Switching to Monthly is not permitted until your yearly plan ends.',
      });
      return;
    }

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
      const rate = await fetchUsdToInrRate();
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
          key: RZP_KEY, amount, currency, name: 'Scrapify',
          description: `${p.name} Plan — ${billingLabel}`,
          image: '/scrapify.png', order_id,
          theme: { color: '#344de1' },
          prefill: { email: user?.email ?? '', name: user?.full_name ?? '' },
          handler: async (response: any) => {
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
                  token, plan: p.id, billing_cycle: yearlyBilling ? 'yearly' : 'monthly',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  amount: usdPrice * 100, currency: 'USD',
                }),
              });
              const sData = await sRes.json().catch(() => ({}));
              if (!sRes.ok) throw new Error(sData.detail ?? 'Plan activation failed. Contact support.');
              await refresh();
              setUpgradeMsg({ type: 'success', text: sData.message ?? `🎉 You're now on the ${p.name} plan!` });
              setTimeout(() => { setShowUpgrade(false); setUpgradeMsg(null); }, 3500);
            } catch (e: any) { setUpgradeMsg({ type: 'error', text: e.message }); }
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
    } finally { setPaying(null); }
  }

  return (
    <AppShell>
      <div className="page">
        {/* ── WORKSPACE OVERVIEW HEADING ── */}
        <div className="page-heading">
          <div>
            <p className="eyebrow">WORKSPACE OVERVIEW</p>
            <h1>Good morning, {firstName}</h1>
            <p className="heading-copy">Turn public web data into clean, useful lists in a few clicks.</p>
          </div>
          <button
            onClick={() => {
              if (isExpired) {
                setShowUpgrade(true);
              } else {
                navigate('/youtube-scraper');
              }
            }}
            className="primary-button"
          >
            <Plus className="w-4 h-4" /> New scrape <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── SUBSCRIPTION EXPIRY NOTICE IF EXPIRED ── */}
        {isExpired && (
          <div className="flex items-center justify-between bg-[#feeaed] border border-[#fccdd5] rounded-2xl px-5 py-4 mb-8 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#d23a52] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#8e1d30]">Free trial expired</p>
                <p className="text-xs text-[#b82e46]">Your 3-day free trial has ended. Upgrade your plan to unlock all scrapers and export without limits.</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="primary-button text-xs py-2 px-4"
            >
              Upgrade now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── HERO BANNER: FIND THE SIGNAL IN THE NOISE ── */}
        <div className="welcome-card gradient-card">
          <div>
            <span className="mini-badge">
              <Sparkles className="w-3 h-3" /> YOUR WORKSPACE
            </span>
            <h2>Find the signal in the noise.</h2>
            <p>
              Scrape maps, YouTube, and websites. Scrapify handles the repetitive
              work and gives you a tidy spreadsheet.
            </p>
            <button
              onClick={() => {
                if (isExpired) {
                  setShowUpgrade(true);
                } else {
                  navigate('/map-scraper');
                }
              }}
              className="light-button"
            >
              {isExpired ? 'Upgrade to access Map Scraper' : 'Start with Map Scraper'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Orbital Celestial Art with Center Map Pin & Floating Tags */}
          <div className="orbital-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-pin">
              <Map className="w-7 h-7 text-[#344de1]" />
            </div>
            <div className="float-tag tag-one">
              <Map className="w-3.5 h-3.5 text-[#344de1]" />
              <span>Bristol, UK</span>
            </div>
            <div className="float-tag tag-two">
              <Check className="w-3.5 h-3.5 text-[#16a36f]" />
              <span>25 leads found</span>
            </div>
          </div>
        </div>

        {/* ── QUICK START WORKFLOWS ── */}
        <div className="section-title">
          <div>
            <p className="eyebrow">QUICK START</p>
            <h2>Choose a workflow</h2>
          </div>
          <button onClick={() => navigate('/guide')} className="text-button">
            <span>How it works</span> <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="workflow-grid">
          {/* 1. YouTube Scraper */}
          <div
            onClick={() => {
              if (isExpired) {
                setShowUpgrade(true);
              } else {
                navigate('/youtube-scraper');
              }
            }}
            className={`workflow-card group ${isExpired ? 'opacity-65 grayscale-[40%] hover:grayscale-0 border-amber-200/80 bg-slate-50/80' : 'cursor-pointer'}`}
            style={isExpired ? { cursor: 'pointer', borderColor: '#fde68a' } : {}}
          >
            <div className="flex items-center justify-between">
              <div className={`card-icon red ${isExpired ? '!bg-slate-200 !text-slate-500' : ''}`}>
                <Youtube className="w-5 h-5" />
              </div>
              {isExpired && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300/60">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <div className="card-label">
              <span>YOUTUBE SCRAPER</span>
            </div>
            <strong>Video data & stats</strong>
            <p>
              Extract video titles, channels, view counts, likes and upload dates by keyword or channel URL.
            </p>
            {isExpired ? (
              <div className="card-link" style={{ color: '#d97706', fontWeight: 700 }}>
                <span>Upgrade your plan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            ) : (
              <div className="card-link red-text">
                <span>Open workflow</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </div>

          {/* 2. Website Scraper */}
          <div
            onClick={() => {
              if (isExpired) {
                setShowUpgrade(true);
              } else {
                navigate('/website-scraper');
              }
            }}
            className={`workflow-card group ${isExpired ? 'opacity-65 grayscale-[40%] hover:grayscale-0 border-amber-200/80 bg-slate-50/80' : 'cursor-pointer'}`}
            style={isExpired ? { cursor: 'pointer', borderColor: '#fde68a' } : {}}
          >
            <div className="flex items-center justify-between">
              <div className={`card-icon green ${isExpired ? '!bg-slate-200 !text-slate-500' : ''}`}>
                <Globe className="w-5 h-5" />
              </div>
              {isExpired && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300/60">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <div className="card-label">
              <span>WEBSITE SCRAPER</span>
            </div>
            <strong>Contacts &amp; page data</strong>
            <p>
              Crawl any site to extract verified emails, phone numbers, social profiles, and link hierarchies.
            </p>
            {isExpired ? (
              <div className="card-link" style={{ color: '#d97706', fontWeight: 700 }}>
                <span>Upgrade your plan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            ) : (
              <div className="card-link green-text">
                <span>Open workflow</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </div>

          {/* 3. Map Scraper */}
          <div
            onClick={() => {
              if (isExpired) {
                setShowUpgrade(true);
              } else {
                navigate('/map-scraper');
              }
            }}
            className={`workflow-card group ${isExpired ? 'opacity-65 grayscale-[40%] hover:grayscale-0 border-amber-200/80 bg-slate-50/80' : 'cursor-pointer'}`}
            style={isExpired ? { cursor: 'pointer', borderColor: '#fde68a' } : {}}
          >
            <div className="flex items-center justify-between">
              <div className={`card-icon blue ${isExpired ? '!bg-slate-200 !text-slate-500' : ''}`}>
                <Map className="w-5 h-5" />
              </div>
              {isExpired ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300/60">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              ) : (
                <div className="card-label !p-0 !m-0">
                  <span className="new-label">NEW</span>
                </div>
              )}
            </div>
            <div className="card-label">
              <span>MAP SCRAPER</span>
            </div>
            <strong>Local business leads</strong>
            <p>
              Search places, restaurants, agencies or shops. Extract addresses, ratings, phone numbers and websites.
            </p>
            {isExpired ? (
              <div className="card-link" style={{ color: '#d97706', fontWeight: 700 }}>
                <span>Upgrade your plan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            ) : (
              <div className="card-link">
                <span>Open workflow</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="stats-row">
          <div>
            <div className="stat-icon">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <strong>2,480+</strong>
              <span>Total records scraped</span>
            </div>
          </div>

          <div>
            <div className="stat-icon green-bg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <strong>99.4%</strong>
              <span>Extraction accuracy</span>
            </div>
          </div>

          <div>
            <div className="stat-icon red-bg">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <strong>3 Workflows</strong>
              <span>Ready for instant export</span>
            </div>
          </div>
        </div>

        {/* ── UPGRADE MODAL ── */}
        {showUpgrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: 'rgba(23,32,51,0.5)' }}>
            <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl border border-[#e4eaf3] relative">
              <button
                onClick={() => setShowUpgrade(false)}
                className="absolute right-5 top-5 p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <span className="mini-badge blue-badge mb-2">
                  <Crown className="w-3.5 h-3.5" /> UPGRADE PLAN
                </span>
                <h2 className="text-2xl font-bold text-[#172033]">Choose a Scrapify Plan</h2>
                <p className="text-sm text-[#758198] mt-1">Unlock unlimited scrapes and priority export.</p>

                {/* Billing toggle */}
                <div className="inline-flex items-center gap-2 p-1 bg-[#f4f7fc] border border-[#e4eaf3] rounded-xl mt-4">
                  <button
                    onClick={() => setYearlyBilling(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !yearlyBilling ? 'bg-white text-[#344de1] shadow-sm' : 'text-[#758198]'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setYearlyBilling(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      yearlyBilling ? 'bg-white text-[#344de1] shadow-sm' : 'text-[#758198]'
                    }`}
                  >
                    Yearly (Save 20%)
                  </button>
                </div>
              </div>

              {upgradeMsg && (
                <div className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  upgradeMsg.type === 'success' ? 'bg-[#edfff6] text-[#128b5e]' : 'bg-[#feeaed] text-[#d23a52]'
                }`}>
                  {upgradeMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {UPGRADE_PLANS.map((p) => {
                  const priceLabel = yearlyBilling ? p.yearly.label : p.monthly.label;
                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-xl border transition-all ${
                        p.highlight
                          ? 'border-[#344de1] bg-[#f8fbff] shadow-md'
                          : 'border-[#e4eaf3] bg-white'
                      }`}
                    >
                      <h4 className="font-bold text-[#172033] text-base mb-1">{p.name}</h4>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-bold text-[#172033]">
                          {yearlyBilling ? (p.id === 'basic' ? '$60' : '$96') : priceLabel}
                        </span>
                        <span className="text-xs text-[#758198]">{yearlyBilling ? '/year' : '/month'}</span>
                      </div>
                      {yearlyBilling && (
                        <p className="text-[11px] text-emerald-600 font-semibold mb-3">
                          Just {p.yearly.label}/mo · Save $12/yr
                        </p>
                      )}
                      <ul className="space-y-2 mb-5">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[#526078]">
                            <Check className="w-3.5 h-3.5 text-[#16a36f] shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {(() => {
                        const isSamePlanAndCycle = isPaid && !isExpired && plan === p.id && (billing_cycle === (yearlyBilling ? 'yearly' : 'monthly'));
                        const isUpgradeToYearly = isPaid && !isExpired && billing_cycle === 'monthly' && yearlyBilling;
                        const isDowngradeCycle = isPaid && !isExpired && billing_cycle === 'yearly' && !yearlyBilling;
                        const isDisallowed = isDowngradeCycle || isSamePlanAndCycle;
                        const isBtnDisabled = paying === p.id || isDisallowed;

                        return (
                          <button
                            onClick={() => handlePay(p)}
                            disabled={isBtnDisabled}
                            className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
                              isSamePlanAndCycle
                                ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-default'
                                : isDisallowed
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  : 'primary-button'
                            }`}
                          >
                            {paying === p.id ? (
                              <Loader2 className="w-4 h-4 spin mx-auto" />
                            ) : isSamePlanAndCycle ? (
                              `Active (${p.name} ${billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'})`
                            ) : isUpgradeToYearly ? (
                              `Switch to ${p.name} Yearly →`
                            ) : isDowngradeCycle ? (
                              'Yearly plan active'
                            ) : (
                              `Select ${p.name}`
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
