import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, planLabel } from '../contexts/SubscriptionContext';
import { AppShell } from '../components/AppShell';
import {
  User, Check, Loader2,
  LogOut, Trash2, AlertTriangle,
} from 'lucide-react';

export function Profile() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, uploadAvatar, deleteAccount } = useAuth() as any;
  const { plan, can_scrape, loading: subLoading } = useSubscription() as any;

  const [editName,  setEditName]  = useState(user?.full_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [saving,    setSaving]    = useState(false);
  const [savedOk,   setSavedOk]   = useState(false);
  const [error,     setError]     = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,   setDeleting]  = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) { setEditName(user.full_name || ''); setEditEmail(user.email || ''); }
  }, [user]);

  const isPaid    = plan === 'basic' || plan === 'standard';
  const isExpired = !can_scrape && !subLoading;
  const userInitials = user?.full_name
    ?.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'JD';

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
        await updateProfile(editName.trim(), editEmail.trim());
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center border border-[#e4eaf3]">
            <div className="w-12 h-12 rounded-2xl bg-[#fff5df] flex items-center justify-center mx-auto mb-4 text-[#db982b]">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#172033] mb-1">Sign out?</h3>
            <p className="text-sm text-[#758198] mb-5">You will need to log back in to access your scrapers.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 border border-[#dce3ed] rounded-xl text-sm font-semibold text-[#526078] hover:bg-[#f6f8fc]"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#172033] hover:bg-black"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center border border-[#e4eaf3]">
            <div className="w-12 h-12 rounded-2xl bg-[#feeaed] flex items-center justify-center mx-auto mb-4 text-[#e0354c]">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#172033] mb-1">Delete account?</h3>
            <p className="text-sm text-[#758198] mb-5">
              This action is permanent and cannot be undone. All your saved data and leads will be wiped.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-[#dce3ed] rounded-xl text-sm font-semibold text-[#526078] hover:bg-[#f6f8fc]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#e0354c] hover:bg-[#c9243a] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 spin" /> Deleting...
                  </>
                ) : (
                  'Delete account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
