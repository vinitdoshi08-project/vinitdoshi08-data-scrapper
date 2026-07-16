import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel, planBadgeClass } from '../contexts/SubscriptionContext';
import {
  X, Edit2, Check, Loader2, LogOut, Crown, Mail, User,
  Calendar, Shield, Zap, ChevronRight, Camera,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

function InitialsAvatar({ initials, size = 76 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '16px',
      background: 'linear-gradient(135deg, #5B4FE8 0%, #7C6FEF 50%, #a78bfa 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 800, color: '#fff',
      letterSpacing: '-0.02em', flexShrink: 0,
      boxShadow: '0 8px 32px rgba(91,79,232,0.35)',
    }}>
      {initials}
    </div>
  );
}

export function ProfileModal({ onClose }: Props) {
  const { user, signOut, updateProfile } = useAuth();
  const { plan, can_scrape, trial_ends_at, billing_cycle, loading: subLoading } =
    useSubscription() as any;
  const expires_at = (useSubscription() as any).expires_at ?? null;
  const navigate = useNavigate();

  const [tab, setTab]             = useState<'profile' | 'edit'>('profile');
  const [editName, setEditName]   = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [isUpdating, setIsUpdating]     = useState(false);
  const [savedOk, setSavedOk]           = useState(false);
  const [showLogout, setShowLogout]     = useState(false);
  const [avatarErr, setAvatarErr]       = useState(false);

  useEffect(() => {
    if (user) { setEditName(user.full_name || ''); setEditEmail(user.email || ''); }
  }, [user]);

  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;

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
        await updateProfile(editName.trim(), editEmail.trim());
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

  /* ── Logout confirmation overlay ── */
  if (showLogout) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', fontFamily: FF }}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Out</h3>
          <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowLogout(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSignOut}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', fontFamily: FF }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all duration-200"
          style={{ backdropFilter: 'blur(4px)' }}>
          <X className="w-4 h-4" />
        </button>

        {/* ── HERO HEADER ── */}
        <div className="relative px-7 pt-8 pb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #4338CA 0%, #5B4FE8 40%, #7C6FEF 75%, #a78bfa 100%)' }}>
          {/* decorative blobs */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.04)' }} />

          <div className="relative flex items-end gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-[76px] h-[76px] rounded-2xl overflow-hidden shadow-xl"
                style={{ border: '3px solid rgba(255,255,255,0.3)' }}>
                {!avatarErr
                  ? <img src="/avatar.png" alt="avatar" className="w-full h-full object-cover"
                      onError={() => setAvatarErr(true)} />
                  : <InitialsAvatar initials={userInitials} size={76} />}
              </div>
              {/* camera badge */}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform">
                <Camera className="w-3 h-3 text-indigo-600" />
              </div>
            </div>

            {/* Name + email + badges */}
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-white leading-tight truncate">
                {user?.full_name || 'User'}
              </h2>
              <p className="text-sm text-white/70 truncate mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full
                  ${isPaid ? 'bg-white/20 text-white' : 'bg-amber-400/25 text-amber-100'}`}>
                  <Crown className="w-3 h-3" />
                  {subLoading ? '…' : planLabel(plan as any)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${isExpired ? 'bg-red-400/30 text-red-100' : 'bg-emerald-400/25 text-emerald-100'}`}>
                  {subLoading ? '…' : planStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-gray-100 px-7 bg-white">
          {(['profile', 'edit'] as const).map(t => (
            <button key={t}
              onClick={() => { setTab(t); setProfileError(''); setSavedOk(false); }}
              className={`py-3.5 px-1 mr-6 text-sm font-semibold border-b-2 transition-all duration-200
                ${tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t === 'profile' ? 'Overview' : 'Edit Profile'}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <div className="px-7 py-5 bg-white">

          {/* ── Overview Tab ── */}
          {tab === 'profile' && (
            <div className="space-y-3">
              {/* Info rows */}
              {[
                { icon: <User className="w-4 h-4 text-indigo-400" />,     label: 'Full Name',    value: user?.full_name || '—' },
                { icon: <Mail className="w-4 h-4 text-indigo-400" />,     label: 'Email',        value: user?.email     || '—' },
                { icon: <Calendar className="w-4 h-4 text-indigo-400" />, label: 'Member since', value: joinDate               },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100 shrink-0">
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">{row.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{row.value}</p>
                  </div>
                </div>
              ))}

              {/* Subscription tile */}
              <div className={`rounded-xl border p-4 ${isPaid ? 'bg-indigo-50 border-indigo-100' : isExpired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-indigo-600' : isExpired ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {isPaid
                        ? <Crown className="w-4 h-4 text-white" />
                        : <Shield className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {subLoading ? 'Loading…' : planLabel(plan as any)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {subLoading ? '—' : isExpired ? 'Subscription expired' : `Active · Expires ${fmtDate(expiryDate)}`}
                      </p>
                    </div>
                  </div>
                  {!isPaid && !subLoading && (
                    <button onClick={() => { onClose(); navigate('/#pricing'); }}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg transition-all hover:shadow-sm">
                      Upgrade <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Plan',    value: subLoading ? '…' : planLabel(plan as any).split(' ')[0], icon: <Crown className="w-3.5 h-3.5 text-indigo-500" /> },
                  { label: 'Status',  value: subLoading ? '…' : planStatus,                           icon: <Zap className="w-3.5 h-3.5 text-emerald-500" /> },
                  { label: 'Billing', value: subLoading ? '…' : isPaid ? (billing_cycle === 'yearly' ? 'Yearly' : 'Monthly') : 'Trial', icon: <Calendar className="w-3.5 h-3.5 text-amber-500" /> },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl py-3 px-2 text-center">
                    {s.icon}
                    <p className="text-sm font-bold text-gray-900 leading-none mt-0.5">{s.value}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <button onClick={() => setTab('edit')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
              <button onClick={() => setShowLogout(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors">
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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

              <div className="flex gap-3 pt-1">
                <button type="button"
                  onClick={() => { setTab('profile'); setProfileError(''); setEditName(user?.full_name||''); setEditEmail(user?.email||''); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#5B4FE8,#7C6FEF)' }}>
                  {isUpdating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
