import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel } from '../contexts/SubscriptionContext';
import { AppShell } from '../components/AppShell';
import {
  User, Check, Loader2,
  LogOut, Trash2, AlertTriangle, Phone, ChevronDown, X, ShieldAlert,
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

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, uploadAvatar, deleteAccount } = useAuth() as any;
  const { plan, can_scrape, loading: subLoading } = useSubscription() as any;

  const [editName,    setEditName]    = useState(user?.full_name || '');
  const [editEmail,   setEditEmail]   = useState(user?.email || '');
  const [countryCode, setCountryCode] = useState('+91');
  const [editPhone,   setEditPhone]   = useState(user?.phone || '');
  const [saving,      setSaving]      = useState(false);
  const [savedOk,     setSavedOk]     = useState(false);
  const [error,       setError]       = useState('');
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;
  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'JD';

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  const joinDate = user?.created_at ? fmtDate(user.created_at) : '—';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (updateProfile) {
        const fullPhone = editPhone.trim() ? `${countryCode} ${editPhone.trim()}` : '';
        await updateProfile(editName.trim(), editEmail.trim(), fullPhone);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2500);
      }
    } catch (err: any) { setError(err.message || 'Failed to update profile'); }
    finally { setSaving(false); }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setAvatarUploading(true);
    setError('');
    try {
      await uploadAvatar(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  return (
    <AppShell>
      <div className="page">
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <p className="eyebrow">ACCOUNT SETTINGS</p>
            <h1>Profile &amp; Settings</h1>
            <p className="heading-copy">
              Manage your personal credentials, identity, security preferences, and subscription tier.
            </p>
          </div>
        </div>

        {/* 2-Column Profile Layout */}
        <div className="profile-layout">
          {/* Left Column: Personal info */}
          <div className="card-surface profile-card">
            <div className="profile-heading">
              <h2>Personal information</h2>
              <p>Update your public identity and profile avatar</p>
            </div>

            <div className="profile-form">
              {/* Avatar column */}
              <div className="profile-avatar">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="avatar"
                    className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-white"
                  />
                ) : (
                  <span>{userInitials}</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Uploading...' : 'Change avatar'}
                </button>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSave} className="profile-fields">
                {error && (
                  <div className="mb-4 p-3 text-xs text-[#d23a52] bg-[#feeaed] border border-[#fccdd5] rounded-xl">
                    {error}
                  </div>
                )}
                {savedOk && (
                  <div className="mb-4 p-3 text-xs text-[#128b5e] bg-[#edfff6] border border-[#bcefdc] rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4" /> Profile updated successfully!
                  </div>
                )}

                <div className="field-group">
                  <label>Full Name</label>
                  <div className="input-wrap">
                    <User className="w-4 h-4 text-[#9aa5b5]" />
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Email Address</label>
                  <div className="input-wrap disabled-input">
                    <input type="email" value={editEmail} disabled />
                  </div>
                  <span className="field-hint">Email address cannot be changed directly</span>
                </div>

                <div className="field-group">
                  <label>Phone Number (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="h-[46px] pl-9 pr-7 border border-[#dce3ed] rounded-xl text-sm font-semibold text-[#3d4a61] bg-white hover:border-[#b8c6dc] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/10 appearance-none cursor-pointer transition-all"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none">
                        {selectedCountry.flag}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#9aa5b5] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="input-wrap flex-1">
                      <Phone className="w-4 h-4 text-[#9aa5b5] shrink-0" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                        placeholder="98765 43210"
                        className="w-full text-sm outline-none bg-transparent text-[#3d4a61]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button save-profile"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save changes
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Account status */}
          <div className="card-surface profile-card">
            <div className="profile-heading">
              <h2>Account overview</h2>
              <p>System identity &amp; account limits</p>
            </div>

            <div className="account-overview">
              <div>
                <span>CURRENT PLAN</span>
                <strong>{subLoading ? '...' : planLabel(plan as any)}{!isPaid ? ' trial' : ''}</strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong className={isExpired ? 'text-[#e0354c]' : 'text-[#128b5e]'}>
                  {isExpired ? 'Expired' : 'Active'}
                </strong>
              </div>
              <div>
                <span>MEMBER SINCE</span>
                <strong>{joinDate}</strong>
              </div>
              <div>
                <span>ACCOUNT ID</span>
                <strong className="font-mono text-xs truncate max-w-[140px]">{user?.id || '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="danger-card">
          <div className="danger-heading">
            <div className="danger-icon">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3>Danger Zone</h3>
              <p>Sign out of your active session or permanently delete your account and datasets.</p>
            </div>
          </div>

          <div className="danger-actions">
            <button onClick={() => setShowLogout(true)}>
              <LogOut className="w-4 h-4" /> Sign out
            </button>
            <button onClick={() => setShowDelete(true)} className="delete-button">
              <Trash2 className="w-4 h-4" /> Delete account
            </button>
          </div>
        </div>

        <p className="profile-footer">
          Scrapify — clean data, three clicks away.
        </p>
      </div>

      {/* Sign out confirm modal */}
      {showLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: 'rgba(15, 23, 42, 0.45)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowLogout(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-[380px] w-full p-6 shadow-2xl border border-slate-100 text-left"
            style={{
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLogout(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="pr-6 pt-0.5">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Sign out of Scrapify?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You will need to log back in to access your scrapers
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowLogout(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm hover:shadow cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: 'rgba(15, 23, 42, 0.45)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => !deleting && setShowDelete(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-2xl border border-slate-100 text-left"
            style={{
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close 'X' Button */}
            <button
              onClick={() => !deleting && setShowDelete(false)}
              disabled={deleting}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Icon + Title */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="pr-6 pt-0.5">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Delete account permanently?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action cannot be reversed
                </p>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="bg-red-50/60 border border-red-100/80 rounded-xl p-3.5 mb-5 text-xs text-red-900 leading-relaxed">
              <p className="font-semibold mb-1 text-red-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                What will happen:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-red-700">
                <li>Your profile and login will be deleted immediately.</li>
                <li>Any active subscription and scraper quotas are canceled.</li>
                <li>All scraped leads and history will be wiped.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm hover:shadow cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Delete My Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
