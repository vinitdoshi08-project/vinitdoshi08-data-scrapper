import { useState, useEffect, useCallback } from 'react';
import { useSubscription, planLabel, planRank } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/AppShell';
import { supabase } from '../lib/supabase';
import {
  Crown, CheckCircle2, AlertTriangle, RefreshCw, Loader2, CreditCard,
  Sparkles, ArrowRight, Shield, Clock,
  ChevronRight, RefreshCcw,
  StopCircle, XCircle, Download,
} from 'lucide-react';
import { generateInvoicePDF } from '../utils/invoiceGenerator';

const PLANS = [
  {
    id: 'basic' as const, name: 'Basic',
    monthly: { usd: 6, label: '$6' }, yearly: { usd: 5, label: '$5', total: '$60/yr' },
    features: ['Unlimited scrapes','YouTube & Website Scraper','Excel, PDF & JSON export','Priority support','AI extraction'],
  },
  {
    id: 'standard' as const, name: 'Standard',
    monthly: { usd: 9, label: '$9' }, yearly: { usd: 8, label: '$8', total: '$96/yr' },
    features: ['Everything in Basic','Unlimited team members','Advanced analytics','Custom exports','SLA guarantee'],
  },
] as const;

async function fetchRate(): Promise<number> {
  try { const r = await fetch('https://open.er-api.com/v6/latest/USD'); const d = await r.json(); return d?.rates?.INR > 0 ? d.rates.INR : 84; }
  catch { return 84; }
}

function loadRzp(): Promise<void> {
  return new Promise((res, rej) => {
    if ((window as any).Razorpay) { res(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('Razorpay could not load.'));
    document.body.appendChild(s);
  });
}

function fmtDate(iso?: string | null, fallback = '—') {
  if (!iso) return fallback;
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function daysLeft(iso?: string | null) {
  if (!iso) return 0;
  try { return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)); } catch { return 0; }
}

interface Payment { id: string; plan: string; payment_id: string; amount: number; currency: string; status: string; created_at: string; }

// ── Generic confirm modal ─────────────────────────────────────
function ActionModal({ icon, title, desc, confirmLabel, onConfirm, onCancel, loading, danger = false }: {
  icon: React.ReactNode; title: string; desc: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#e4eaf3]">
        <div className={`p-7 text-center ${danger ? 'bg-[#fef7f8]' : 'bg-[#f7f9fd]'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-[#feeaed] text-[#e0354c]' : 'bg-[#edf1ff] text-[#344de1]'}`}>
            {icon}
          </div>
          <h2 className="text-xl font-bold text-[#172033] mb-2">{title}</h2>
          <p className="text-sm text-[#758198] leading-relaxed">{desc}</p>
        </div>
        <div className="p-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-[#dce3ed] text-[#526078] font-semibold text-sm hover:bg-[#f6f8fc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity ${danger ? 'bg-[#e0354c] hover:bg-[#c9243a]' : 'primary-button'}`}
          >
            {loading ? <><Loader2 className="w-4 h-4 spin" /> Processing…</> : <>{confirmLabel} <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export function Subscription() {
  const { user } = useAuth();
  const { plan, can_scrape, trial_ends_at, loading: subLoading, billing_cycle, expires_at,
    upcoming_plan, upcoming_starts_at, auto_renew, razorpay_sub_id, refresh } = useSubscription() as any;

  const [yearly, setYearly]         = useState(false);
  const [usdToInr, setUsdToInr]     = useState(84);
  const [paying, setPaying]         = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);
  const [msg, setMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loadingPay, setLoadingPay] = useState(false);
  const [modal, setModal]           = useState<null | 'stop' | 'cancel_upcoming' | {
    action: 'upgrade'|'downgrade'|'renewal'|'new'; planId: string; planName: string;
    startsOn?: string; usdAmt: number; payLabel: string;
  }>(null);

  const isPaid     = plan === 'basic' || plan === 'standard';
  const isExpired  = !can_scrape && !subLoading;
  const expiryDate = isPaid ? expires_at : trial_ends_at;
  const remaining  = daysLeft(expiryDate);
  const totalDays  = billing_cycle === 'yearly' ? 365 : isPaid ? 30 : 3;
  const progress   = Math.min(100, (remaining / totalDays) * 100);

  const API_URL = import.meta.env.VITE_API_URL as string;
  const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

  useEffect(() => { fetchRate().then(setUsdToInr); }, []);

  const loadPayments = useCallback(async () => {
    setLoadingPay(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/payments?token=${encodeURIComponent(session.access_token)}`);
      if (res.ok) { const d = await res.json(); setPayments(d.payments ?? []); }
    } catch { /**/ } finally { setLoadingPay(false); }
  }, [API_URL]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  function getAction(id: string): 'upgrade'|'downgrade'|'renewal'|'new' {
    if (!isPaid || isExpired) return 'new';
    if (id === plan) return 'renewal';
    return planRank(id) > planRank(plan) ? 'upgrade' : 'downgrade';
  }

  // ── Stop subscription ──────────────────────────────────────
  async function handleStop() {
    setBusy(true); setModal(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/cancel-auto-renew`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, sub_id: razorpay_sub_id ?? '' }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg({ type: 'success', text: d.message ?? `✅ Subscription stopped. You keep access until ${fmtDate(expires_at)}.` }); await refresh(); }
      else throw new Error(d.detail ?? 'Could not stop subscription.');
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusy(false); }
  }

  // ── Cancel upcoming scheduled plan ────────────────────────
  async function handleCancelUpcoming() {
    setBusy(true); setModal(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/cancel-upcoming`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg({ type: 'success', text: d.message ?? '✅ Scheduled plan cancelled.' }); await refresh(); }
      else throw new Error(d.detail ?? 'Could not cancel scheduled plan.');
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusy(false); }
  }

  // ── Choose plan → open modal ──────────────────────────────
  function handleChoosePlan(p: typeof PLANS[number]) {
    const usdAmt   = yearly ? p.yearly.usd * 12 : p.monthly.usd;
    const payLabel = yearly ? p.yearly.total : `${p.monthly.label}/mo`;
    const action   = getAction(p.id);
    const startsOn = (action === 'renewal' || action === 'downgrade') ? fmtDate(expires_at) : undefined;
    setMsg(null);
    setModal({ action, planId: p.id, planName: p.name, startsOn, usdAmt, payLabel });
  }

  // ── Pay ────────────────────────────────────────────────────
  async function handlePay() {
    if (!modal || modal === 'stop' || modal === 'cancel_upcoming') return;
    const { planId, planName, usdAmt, payLabel } = modal;
    setModal(null); setPaying(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setMsg({ type: 'error', text: 'Please log in first.' }); return; }
      await loadRzp();
      if (!yearly) {
        const subRes = await fetch(`${API_URL}/api/create-subscription`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, plan: planId, billing_cycle: 'monthly' }),
        });
        if (!subRes.ok) {
          const errData = await subRes.json().catch(() => ({}));
          throw new Error(errData.detail ?? 'Could not create subscription.');
        }
        const { subscription_id } = await subRes.json();
        await new Promise<void>((resolve) => {
          const rzp = new (window as any).Razorpay({
            key: RZP_KEY, subscription_id, name: 'Scrapify',
            description: `${planName} Plan — ${payLabel} (Auto-Renew)`, image: '/scrapify.png',
            theme: { color: '#344de1' }, prefill: { email: user?.email ?? '', name: user?.full_name ?? '' },
            handler: async (response: any) => {
              try {
                const vRes = await fetch(`${API_URL}/api/verify-subscription`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id:   response.razorpay_payment_id,
                    razorpay_subscription_id: response.razorpay_subscription_id,
                    razorpay_signature:    response.razorpay_signature,
                  }),
                });
                if (!vRes.ok) throw new Error('Subscription verification failed.');
                const sRes = await fetch(`${API_URL}/api/save-subscription`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token, plan: planId, billing_cycle: 'monthly',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_sub_id:     response.razorpay_subscription_id,
                    amount: usdAmt * 100, currency: 'USD',
                  }),
                });
                const sData = await sRes.json().catch(() => ({}));
                if (!sRes.ok) throw new Error(sData.detail ?? 'Plan activation failed.');
                await refresh(); await loadPayments();
                setMsg({ type: 'success', text: sData.message ?? `🎉 You are now on the ${planName} plan!` });
              } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
              resolve();
            },
            modal: { ondismiss: () => resolve() },
          });
          rzp.on('payment.failed', (r: any) => { setMsg({ type: 'error', text: r.error?.description ?? 'Payment failed.' }); resolve(); });
          rzp.open();
        });
      } else {
        await doOneTime(token, planId, planName, usdAmt, payLabel, true);
      }
    } catch (e: any) { setMsg({ type: 'error', text: e.message ?? 'Something went wrong.' }); }
    finally { setPaying(null); }
  }

  async function doOneTime(token: string, planId: string, planName: string, usdAmt: number, payLabel: string, isYearly: boolean) {
    const rate = await fetchRate();
    const orderRes = await fetch(`${API_URL}/api/create-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(usdAmt * rate * 100), currency: 'INR' }),
    });
    if (!orderRes.ok) { const e = await orderRes.json().catch(() => ({})); throw new Error(e.detail ?? 'Could not create order.'); }
    const { order_id, amount, currency } = await orderRes.json();
    await new Promise<void>(resolve => {
      const rzp = new (window as any).Razorpay({
        key: RZP_KEY, amount, currency, name: 'Scrapify',
        description: `${planName} — ${payLabel}`, image: '/scrapify.png', order_id,
        theme: { color: '#344de1' }, prefill: { email: user?.email ?? '', name: user?.full_name ?? '' },
        handler: async (r: any) => {
          try {
            const vRes = await fetch(`${API_URL}/api/verify-payment`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
            });
            if (!vRes.ok) { const e = await vRes.json().catch(() => ({})); throw new Error(e.detail ?? 'Verification failed.'); }
            const sRes = await fetch(`${API_URL}/api/save-subscription`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, plan: planId, billing_cycle: isYearly ? 'yearly' : 'monthly',
                razorpay_payment_id: r.razorpay_payment_id, razorpay_order_id: r.razorpay_order_id,
                amount: usdAmt * 100, currency: 'USD' }),
            });
            const sData = await sRes.json().catch(() => ({}));
            if (!sRes.ok) throw new Error(sData.detail ?? 'Activation failed.');
            await refresh(); await loadPayments();
            setMsg({ type: 'success', text: sData.message ?? `🎉 You are now on the ${planName} plan!` });
          } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
          resolve();
        },
        modal: { ondismiss: () => resolve() },
      });
      rzp.on('payment.failed', (r: any) => { setMsg({ type: 'error', text: r.error?.description ?? 'Payment failed.' }); resolve(); });
      rzp.open();
    });
  }

  return (
    <AppShell>
      <div className="page">
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <p className="eyebrow">BILLING &amp; SUBSCRIPTION</p>
            <h1>Subscription &amp; Plans</h1>
            <p className="heading-copy">Manage your scraping limits, active subscription tier, and invoices.</p>
          </div>
          <button onClick={async () => { await refresh(); await loadPayments(); }} className="secondary-button">
            <RefreshCw className="w-4 h-4" /> Refresh status
          </button>
        </div>

        {/* Toast Alert */}
        {msg && (
          <div className={`toast ${msg.type === 'error' ? 'red-badge' : ''}`} style={{ position: 'static', marginBottom: '20px' }}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        {/* ── CURRENT PLAN CARD ── */}
        <div className="card-surface billing-current">
          <div className="billing-top">
            <div className="current-plan-line">
              <div className="plan-crown">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2>{planLabel(plan)} Plan</h2>
                <p>
                  {isPaid ? `${billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} billing cycle` : isExpired ? 'Trial expired' : '3-day free trial active'}
                </p>
              </div>
            </div>

            <div>
              <span className={`active-pill ${isExpired ? 'paused' : ''}`}>
                {isExpired ? 'Expired' : auto_renew ? 'Active · Auto-renew' : 'Active'}
              </span>
            </div>
          </div>

          {/* Metrics row */}
          <div className="billing-metrics">
            <div>
              <span>CURRENT TIER</span>
              <strong>{planLabel(plan)}</strong>
            </div>
            <div>
              <span>ACCOUNT STATUS</span>
              <strong className={isExpired ? 'text-[#e0354c]' : 'text-[#128b5e]'}>{isExpired ? 'Expired' : 'Active'}</strong>
            </div>
            <div>
              <span>{isPaid ? 'RENEWS / EXPIRES' : 'TRIAL ENDS'}</span>
              <strong>{fmtDate(expiryDate)}</strong>
            </div>
            <div>
              <span>DAYS REMAINING</span>
              <strong>{remaining > 0 ? `${remaining} days` : '0 days'}</strong>
            </div>
          </div>

          {/* Usage bar */}
          {!isExpired && expiryDate && (
            <div>
              <div className="usage-line">
                <span>Plan period progress</span>
                <span>{remaining} day{remaining !== 1 ? 's' : ''} remaining</span>
              </div>
              <div className="usage-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            {isPaid && !isExpired && auto_renew && (
              <button onClick={() => setModal('stop')} disabled={busy} className="secondary-button text-[#e0354c] border-[#f3c8cf]">
                <StopCircle className="w-4 h-4" /> Stop auto-renew
              </button>
            )}
            {isExpired && (
              <button onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })} className="primary-button">
                Upgrade now <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── UPCOMING PLAN CARD IF SCHEDULED ── */}
        {!subLoading && upcoming_plan && upcoming_starts_at && (
          <div className="card-surface p-6 mb-5 border-blue-200 bg-blue-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#344de1]" />
                <div>
                  <strong className="text-sm text-[#172033]">Scheduled Plan Change: {planLabel(upcoming_plan)}</strong>
                  <p className="text-xs text-[#758198] m-0">Starts automatically on {fmtDate(upcoming_starts_at)} after current period ends.</p>
                </div>
              </div>
              <button onClick={() => setModal('cancel_upcoming')} disabled={busy} className="secondary-button text-xs py-1.5 px-3">
                Cancel scheduled change
              </button>
            </div>
          </div>
        )}

        {/* ── PRICING SECTION ── */}
        <div id="pricing-section" className="card-surface billing-section">
          <div className="section-heading">
            <div>
              <h2>Choose a plan</h2>
              <p className="heading-copy">Upgrade to unlock unlimited scraping volume and multi-channel extraction.</p>
            </div>

            <div className="billing-toggle">
              <button onClick={() => setYearly(false)} className={!yearly ? 'selected' : ''}>
                Monthly
              </button>
              <button onClick={() => setYearly(true)} className={yearly ? 'selected' : ''}>
                Yearly <span>SAVE 16%</span>
              </button>
            </div>
          </div>

          <div className="billing-notice">
            <RefreshCcw className="w-4 h-4 text-[#344de1] shrink-0" />
            <span>
              <strong>Auto-renew included:</strong> {yearly ? 'Charged once per year.' : 'Billed monthly via Razorpay.'} You can pause or cancel anytime.
            </span>
          </div>

          <div className="pricing-grid">
            {PLANS.map(p => {
              const usdAmt   = yearly ? p.yearly.usd * 12 : p.monthly.usd;
              const inrAmt   = Math.round(usdAmt * usdToInr);
              const usdLabel = yearly ? p.yearly.label : p.monthly.label;
              const isCurrent = plan === p.id && !isExpired;
              const isActiveAbove = !isExpired && isPaid && planRank(p.id) < planRank(plan);
              const isDisabled = paying === p.id || (!!paying && paying !== p.id);

              return (
                <div key={p.id} className={`pricing-card ${isCurrent ? 'selected-plan' : p.id === 'standard' ? 'featured-plan' : ''}`}>
                  <div className="plan-tags">
                    {isCurrent && <span className="featured-tag">✓ Current Plan</span>}
                    {isActiveAbove && <span className="included-tag">✓ Included in higher tier</span>}
                    {p.id === 'standard' && !isCurrent && <span className="featured-tag">Most Popular</span>}
                    <span className="auto-tag">Auto-renew</span>
                  </div>

                  <p className="plan-name">{p.name}</p>
                  <div className="price-line">
                    <strong>{usdLabel}</strong>
                    <span>/month</span>
                  </div>
                  <p className="currency-note">≈ ₹{inrAmt.toLocaleString('en-IN')}{yearly ? ' yearly' : '/mo'}</p>

                  <ul>
                    {p.features.map(f => (
                      <li key={f}>
                        <CheckCircle2 className="w-4 h-4" /> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isDisabled && handleChoosePlan(p)}
                    disabled={isDisabled}
                    className={isCurrent ? 'selected-plan-button' : 'primary-button w-full'}
                  >
                    {paying === p.id ? (
                      <><Loader2 className="w-4 h-4 spin" /> Processing...</>
                    ) : isCurrent ? (
                      `Active (${p.name})`
                    ) : (
                      `Select ${p.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PAYMENT METHOD & SECURITY ── */}
        <div className="card-surface billing-section">
          <div className="section-heading">
            <h2>Payment method</h2>
          </div>
          <div className="payment-row">
            <div className="payment-icon">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <strong>Razorpay Secure Checkout</strong>
              <p>UPI, Credit/Debit Cards, NetBanking &amp; RBI-compliant recurring mandates</p>
            </div>
            <div className="text-button">
              <Shield className="w-4 h-4 text-[#16a06d]" /> 256-bit Encrypted
            </div>
          </div>
        </div>

        {/* ── BILLING INVOICES TABLE ── */}
        <div className="card-surface billing-section">
          <div className="section-heading">
            <h2>Payment invoices</h2>
          </div>

          <div className="billing-table">
            <div className="billing-row table-head">
              <span>Invoice ID</span>
              <span>Plan</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span className="text-right">Invoice</span>
            </div>

            {loadingPay ? (
              <div className="p-8 text-center text-xs text-[#758198]">
                <Loader2 className="w-5 h-5 spin mx-auto mb-2 text-[#344de1]" /> Loading invoices...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#758198]">
                No transaction records found yet. Invoices appear automatically upon successful checkout.
              </div>
            ) : (
              payments.map(pay => (
                <div key={pay.id} className="billing-row">
                  <span className="font-mono text-xs text-[#526078]">{pay.payment_id || pay.id.slice(0, 14)}</span>
                  <strong>{pay.plan ? planLabel(pay.plan as any) : 'Starter'}</strong>
                  <span>{fmtDate(pay.created_at)}</span>
                  <span>{pay.currency === 'INR' ? '₹' : '$'}{((pay.amount || 0) / 100).toFixed(2)} {pay.currency}</span>
                  <span>
                    <span className="captured-pill">
                      <CheckCircle2 className="w-3 h-3" /> {pay.status}
                    </span>
                  </span>
                  <div className="flex justify-end">
                    <button
                      onClick={() => generateInvoicePDF({
                        paymentId: pay.payment_id || pay.id,
                        plan: pay.plan,
                        date: fmtDate(pay.created_at),
                        amount: pay.amount,
                        currency: pay.currency,
                        status: pay.status,
                        customerName: user?.full_name,
                        customerEmail: user?.email,
                      })}
                      className="invoice-download-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#344de1] bg-[#edf1ff] hover:bg-[#344de1] hover:text-white transition-all cursor-pointer shadow-xs"
                      title="Download PDF Invoice"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stop subscription modal */}
      {modal === 'stop' && (
        <ActionModal
          icon={<StopCircle className="w-6 h-6" />}
          title="Stop Subscription?"
          desc={`Your ${planLabel(plan)} plan will stay active until ${fmtDate(expires_at)}, then it will not renew.`}
          confirmLabel="Confirm Stop"
          onConfirm={handleStop}
          onCancel={() => setModal(null)}
          loading={busy}
          danger
        />
      )}

      {/* Cancel upcoming modal */}
      {modal === 'cancel_upcoming' && (
        <ActionModal
          icon={<XCircle className="w-6 h-6" />}
          title="Cancel Scheduled Plan?"
          desc={`This will cancel the scheduled change to ${planLabel(upcoming_plan)}. Your current plan remains active.`}
          confirmLabel="Cancel Scheduled Plan"
          onConfirm={handleCancelUpcoming}
          onCancel={() => setModal(null)}
          loading={busy}
          danger
        />
      )}

      {/* Plan confirm modal */}
      {modal && modal !== 'stop' && modal !== 'cancel_upcoming' && (() => {
        const m = modal as { action: string; planName: string; planId: string; startsOn?: string; usdAmt: number; payLabel: string };
        return (
          <ActionModal
            icon={<Sparkles className="w-6 h-6" />}
            title={`Activate ${m.planName} Plan`}
            desc={`Your subscription will be set to ${m.planName} (${m.payLabel}). Ready to proceed?`}
            confirmLabel={`Pay & Activate`}
            onConfirm={handlePay}
            onCancel={() => setModal(null)}
            loading={!!paying}
          />
        );
      })()}
    </AppShell>
  );
}
