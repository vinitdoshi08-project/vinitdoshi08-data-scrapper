import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, Loader2, X, CheckCircle2 } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ── Plan definitions in USD ────────────────────────────────────
// amountUsd: price in US dollars (will be converted to INR paise for Razorpay)
const PLANS = [
  {
    id:        'basic' as const,
    name:      'Basic',
    usdPrice:  6,        // $6/mo displayed
    usdLabel:  '$6',
    features:  ['Unlimited scrapes', 'YouTube & Website scraper', 'Excel, PDF & JSON', 'Priority support', 'AI extraction'],
    highlight: true,
  },
  {
    id:        'standard' as const,
    name:      'Standard',
    usdPrice:  10,       // $10/mo displayed
    usdLabel:  '$10',
    features:  ['Everything in Basic', 'Unlimited team members', 'Advanced analytics', 'Custom exports', 'SLA guarantee'],
    highlight: false,
  },
];

// Fetch live USD→INR exchange rate (fallback 84)
async function fetchUsdToInr(): Promise<number> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    const rate = d?.rates?.INR;
    return rate && rate > 0 ? rate : 84;
  } catch {
    return 84;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

interface TrialGateProps {
  children: React.ReactNode;
  scraperName: string;
}

export function TrialGate({ children, scraperName }: TrialGateProps) {
  const { can_scrape, loading } = useSubscription();
  const { user } = useAuth();
  const { refresh } = useSubscription();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [paying,    setPaying]    = useState<string | null>(null);
  const [msg,       setMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Live rate for display in modal
  const [usdToInr,  setUsdToInr]  = useState<number>(84);

  useEffect(() => {
    fetchUsdToInr().then(setUsdToInr);
  }, []);

  async function getToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch { return null; }
  }

  async function handlePay(p: typeof PLANS[0]) {
    setMsg(null);
    setPaying(p.id);
    try {
      const token = await getToken();
      if (!token) { setMsg({ type: 'error', text: 'Please log in first.' }); return; }

      const API_URL = import.meta.env.VITE_API_URL as string;
      const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

      // Get fresh live rate at payment time
      const rate = await fetchUsdToInr();
      // Convert USD → INR paise for Razorpay (multiply dollars × rate × 100)
      const amountPaise = Math.round(p.usdPrice * rate * 100);

      await loadRazorpayScript();

      // Step 1: Create Razorpay order in INR
      const orderRes = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
      });
      if (!orderRes.ok) throw new Error('Could not create order. Try again.');
      const { order_id, amount, currency } = await orderRes.json();

      // Step 2: Open Razorpay checkout (charges in INR)
      await new Promise<void>((resolve) => {
        const options = {
          key: RZP_KEY, amount, currency,
          name: 'Scrapify',
          description: `${p.name} Plan — ${p.usdLabel}/mo`,
          image: '/scrapify.png', order_id,
          theme: { color: '#5B4FE8' },
          prefill: { email: user?.email ?? '', name: user?.full_name ?? '' },

          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            try {
              // Step 3: Verify signature
              const vRes = await fetch(`${API_URL}/api/verify-payment`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
              });
              if (!vRes.ok) throw new Error('Payment verification failed.');

              // Step 4: Save subscription — store USD amount + USD currency
              const sRes = await fetch(`${API_URL}/api/save-subscription`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  plan:                p.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id:   response.razorpay_order_id,
                  amount:              p.usdPrice * 100, // stored as cents: 600 = $6.00
                  currency:            'USD',
                }),
              });
              if (!sRes.ok) throw new Error('Plan activation failed. Contact support.');

              await refresh();
              setMsg({ type: 'success', text: `🎉 You're now on the ${p.name} plan! Enjoy unlimited scraping.` });
              setTimeout(() => { setShowModal(false); setMsg(null); }, 2500);
            } catch (e: any) {
              setMsg({ type: 'error', text: e.message });
            }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          setMsg({ type: 'error', text: resp.error?.description ?? 'Payment failed.' });
          resolve();
        });
        rzp.open();
      });

    } catch (e: any) {
      setMsg({ type: 'error', text: e.message ?? 'Something went wrong.' });
    } finally {
      setPaying(null);
    }
  }

  return (
    <>
      {!loading && !can_scrape && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="flex items-center justify-between bg-[#feeaed] border border-[#fccdd5] rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fde8ec] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#e0354c]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#8e1d30] m-0">
                  {scraperName} — Free trial expired
                </p>
                <p className="text-xs text-[#b82e46] m-0">
                  Upgrade your plan to unlock unlimited scrapes and exports.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="primary-button text-xs py-2 px-4 shrink-0"
              style={{ background: 'linear-gradient(100deg, #4554e9, #05a9e3)' }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Upgrade now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {children}

      {showModal && (
        <UpgradeModal
          paying={paying}
          msg={msg}
          usdToInr={usdToInr}
          onPay={handlePay}
          onClose={() => { setShowModal(false); setMsg(null); }}
          onViewPricing={() => { setShowModal(false); navigate('/subscription'); }}
        />
      )}
    </>
  );
}

function UpgradeModal({
  paying, msg, usdToInr, onPay, onClose, onViewPricing,
}: {
  paying: string | null;
  msg: { type: 'success' | 'error'; text: string } | null;
  usdToInr: number;
  onPay: (p: typeof PLANS[0]) => void;
  onClose: () => void;
  onViewPricing: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(17,24,39,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative border border-gray-100"
        style={{ boxShadow: '0 20px 60px rgba(91,79,232,.25)' }}>

        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Upgrade your plan</h2>
          <p className="text-sm text-gray-500">Unlock unlimited scraping. No limits, no interruptions.</p>
        </div>

        {msg && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 p-6">
          {PLANS.map(p => {
            const inrEquiv = Math.round(p.usdPrice * usdToInr);
            return (
              <div key={p.id}
                className={`rounded-xl border p-5 flex flex-col ${p.highlight ? 'border-indigo-400 shadow-md' : 'border-gray-200'}`}
                style={p.highlight ? { background: 'linear-gradient(180deg,#faf9ff,#f0eeff)' } : {}}>
                {p.highlight && (
                  <span className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full mb-3 w-fit"
                    style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                    Recommended
                  </span>
                )}
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">{p.name}</p>
                {/* USD price — primary */}
                <p className="text-3xl font-bold text-gray-900 leading-none">{p.usdLabel}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                {/* INR equivalent — secondary, smaller */}
                <p className="text-xs text-indigo-400 font-semibold mt-1 mb-4">≈ ₹{inrEquiv.toLocaleString('en-IN')} charged</p>
                <ul className="space-y-1.5 text-xs text-gray-600 mb-5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onPay(p)}
                  disabled={!!paying}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)', boxShadow: p.highlight ? '0 4px 14px rgba(91,79,232,.38)' : 'none' }}>
                  {paying === p.id
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    : <>Pay {p.usdLabel} <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6 text-center">
          <button onClick={onViewPricing} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            View full pricing details →
          </button>
        </div>
      </div>
    </div>
  );
}
