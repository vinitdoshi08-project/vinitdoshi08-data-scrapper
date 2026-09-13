import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel } from '../contexts/SubscriptionContext';
import {
  X, Edit2, Check, Loader2, LogOut, Crown, Mail, User,
  Calendar, Shield, Zap, ChevronRight, Phone, ChevronDown,
} from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1',  country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+971',country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+1',  country: 'CA', flag: '🇨🇦', name: 'Canada' },
];

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user, signOut, updateProfile } = useAuth() as any;
  const { plan, can_scrape, trial_ends_at, billing_cycle, loading: subLoading } =
    useSubscription() as any;
  const expires_at = (useSubscription() as any).expires_at ?? null;
  const navigate = useNavigate();

  const [tab, setTab]             = useState<'profile' | 'edit'>('profile');
  const [editName, setEditName]   = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [countryCode, setCountryCode] = useState('+91');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdating, setIsUpdating]     = useState(false);
  const [savedOk, setSavedOk]           = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setEditEmail(user.email || '');
      if (user.phone) {
        const found = COUNTRY_CODES.find(c => user.phone.startsWith(c.code));
        if (found) {
          setCountryCode(found.code);
          setEditPhone(user.phone.slice(found.code.length).trim());
        } else {
          setEditPhone(user.phone);
        }
      }
    }
  }, [user]);

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return String(iso); }
  }

  const joinDate   = user?.created_at ? fmtDate(user.created_at) : '—';
  const expiryDate = isPaid ? expires_at : trial_ends_at;
  const planStatus = isExpired ? 'Expired' : 'Active';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setIsUpdating(true);
    try {
      if (updateProfile) {
        const fullPhone = editPhone.trim() ? `${countryCode} ${editPhone.trim()}` : '';
        await updateProfile(editName.trim(), editEmail.trim(), fullPhone);
        setSavedOk(true);
        setTimeout(() => { setSavedOk(false); setTab('profile'); }, 1200);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    onClose();
    navigate('/login');
  }

  const FF = 'Inter,ui-sans-serif,system-ui,sans-serif';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.65)', backdropFilter: 'blur(10px)', fontFamily: FF }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] overflow-hidden relative"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)' }}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm">
          <X className="w-4 h-4" />
        </button>

        {/* ── HERO HEADER ── */}
        <div className="relative px-8 pt-8 pb-7 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 40%, #6D5FE8 75%, #8B75F0 100%)' }}>
          {/* decorative blobs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="absolute top-6 right-1/3 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.03)' }} />

          <div className="relative flex items-center gap-5">
            {/* Avatar — shows photo if uploaded, else initials */}
            <div className="shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar"
                  className="w-[72px] h-[72px] rounded-2xl object-cover shadow-xl"
                  style={{ border: '2.5px solid rgba(255,255,255,0.3)' }} />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-xl"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(8px)',
                    letterSpacing: '-0.03em',
                  }}>
                  {userInitials}
                </div>
              )}
            </div>

            {/* Name + email + badges */}
            <div className="flex-1 min-w-0">
              <h2 className="text-[19px] font-bold text-white leading-tight truncate">
                {user?.full_name || 'User'}
              </h2>
              <p className="text-[13px] text-white/60 truncate mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg
                  ${isPaid ? 'bg-white/20 text-white' : 'bg-amber-400/25 text-amber-100'}`}>
                  <Crown className="w-3 h-3" />
                  {subLoading ? '…' : planLabel(plan as any)}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg
                  ${isExpired ? 'bg-red-400/30 text-red-100' : 'bg-emerald-400/20 text-emerald-100'}`}>
                  {subLoading ? '…' : planStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-gray-100 px-8 bg-white gap-1">
          {(['profile', 'edit'] as const).map(t => (
            <button key={t}
              onClick={() => { setTab(t); setProfileError(''); setSavedOk(false); }}
              className={`py-3.5 px-1 mr-5 text-[13px] font-semibold border-b-2 transition-all duration-200
                ${tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t === 'profile' ? 'Overview' : 'Edit Profile'}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <div className="px-8 py-5 bg-white">

          {/* ── Overview Tab ── */}
          {tab === 'profile' && (
            <div className="space-y-3">
              {/* Info rows */}
              {[
                { icon: <User className="w-4 h-4 text-indigo-500" />,     label: 'Full Name',    value: user?.full_name || '—' },
                { icon: <Mail className="w-4 h-4 text-indigo-500" />,     label: 'Email',        value: user?.email     || '—' },
                { icon: <Phone className="w-4 h-4 text-indigo-500" />,    label: 'Phone',        value: user?.phone     || 'Not set' },
                { icon: <Calendar className="w-4 h-4 text-indigo-500" />, label: 'Member Since', value: joinDate               },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100 shadow-sm shrink-0">
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none">{row.label}</p>
                    <p className="text-[13px] font-semibold text-gray-900 mt-1 truncate">{row.value}</p>
                  </div>
                </div>
              ))}

              {/* Subscription tile */}
              <div className={`rounded-xl border p-4 ${isPaid ? 'bg-indigo-50/70 border-indigo-100' : isExpired ? 'bg-red-50 border-red-100' : 'bg-amber-50/80 border-amber-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isPaid ? 'bg-indigo-600' : isExpired ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {isPaid
                        ? <Crown className="w-4 h-4 text-white" />
                        : <Shield className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">
                        {subLoading ? 'Loading…' : planLabel(plan as any)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {subLoading ? '—' : isExpired ? 'Subscription expired' : `Active · Expires ${fmtDate(expiryDate)}`}
                      </p>
                    </div>
                  </div>
                  {!isPaid && !subLoading && (
                    <button onClick={() => { onClose(); navigate('/#pricing'); }}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg transition-all hover:shadow-sm">
                      Upgrade <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Plan',    value: subLoading ? '…' : planLabel(plan as any).split(' ')[0], icon: <Crown className="w-3.5 h-3.5 text-indigo-500" />, color: 'text-indigo-600' },
                  { label: 'Status',  value: subLoading ? '…' : planStatus,                           icon: <Zap className="w-3.5 h-3.5 text-emerald-500" />,  color: 'text-emerald-600' },
                  { label: 'Billing', value: subLoading ? '…' : isPaid ? (billing_cycle === 'yearly' ? 'Yearly' : 'Monthly') : 'Trial', icon: <Calendar className="w-3.5 h-3.5 text-amber-500" />, color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl py-3.5 px-2 text-center hover:border-gray-200 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                      {s.icon}
                    </div>
                    <p className={`text-[13px] font-bold leading-none ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <button onClick={() => setTab('edit')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 shadow-sm"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#6D5FE8)' }}>
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>

              {/* Sign out — shows confirm popup */}
              <button onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 border border-red-100 hover:bg-red-50 hover:border-red-200 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}

          {/* ── Edit Tab ── */}
          {tab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-4">
              {profileError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 rounded-r-xl">
                  {profileError}
                </div>
              )}
              {savedOk && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-sm px-4 py-3 rounded-r-xl flex items-center gap-2">
                  <Check className="w-4 h-4" /> Profile updated successfully!
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="text" value={editName}
                    onChange={e => setEditName(e.target.value)} required
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="email" value={editEmail}
                    onChange={e => setEditEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Phone Number (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="h-[42px] pl-8 pr-6 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none">
                      {selectedCountry.flag}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                      placeholder="98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setTab('profile'); setProfileError(''); setEditName(user?.full_name || ''); setEditEmail(user?.email || ''); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#6D5FE8)' }}>
                  {isUpdating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sign out confirm overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: 'rgba(15, 23, 42, 0.55)', fontFamily: FF }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-[#e2e8f0]">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-xs">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-2 tracking-tight">Sign out?</h3>
            <p className="text-sm text-[#64748b] mb-6 leading-relaxed">Are you sure you want to sign out? You'll need to sign in again to access your account.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#475569] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1] hover:text-[#1e293b] hover:shadow-xs transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSignOut}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-white hover:to-white hover:text-red-600 hover:border-red-600 border border-transparent shadow-md hover:shadow-lg transition-all cursor-pointer">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
