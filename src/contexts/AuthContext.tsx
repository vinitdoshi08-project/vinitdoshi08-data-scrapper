import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  updateProfile: (fullName: string, email: string, phone?: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(authUser: any) {
    // Always set user from auth metadata immediately — no flash/delay
    const optimistic: User = {
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.user_metadata?.full_name || '',
      created_at: authUser.created_at || new Date().toISOString(),
      avatar_url: authUser.user_metadata?.avatar_url || '',
      phone: authUser.user_metadata?.phone || '',
    };
    setUser(optimistic);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, avatar_url, phone')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn('Profile fetch warning:', profileError.message);
        return;
      }

      if (profile) {
        setUser({
          id:         profile.id,
          email:      authUser.email || '',
          full_name:  profile.full_name || authUser.user_metadata?.full_name || '',
          created_at: profile.created_at || authUser.created_at,
          avatar_url: profile.avatar_url || authUser.user_metadata?.avatar_url || '',
          phone:      profile.phone || authUser.user_metadata?.phone || '',
        });
      }
    } catch (err) {
      console.warn('fetchProfile error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signup(fullName: string, email: string, password: string) {
    try {
      setError(null);
      if (!fullName.trim()) throw new Error('Full name is required');
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email format');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signupError) {
        if (
          signupError.message.toLowerCase().includes('already registered') ||
          signupError.message.toLowerCase().includes('already been registered') ||
          signupError.message.toLowerCase().includes('user already exists')
        ) {
          throw new Error('An account with this email already exists. Please log in instead.');
        }
        throw signupError;
      }

      // In Supabase, if email confirmation is enabled and the user already exists,
      // signUp may return a user with an empty identities array rather than throwing an error.
      if (signupData?.user && signupData.user.identities && signupData.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      throw err;
    }
  }

  async function signin(email: string, password: string) {
    try {
      setError(null);
      const { error: signinError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signinError) throw signinError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signin failed';
      setError(message);
      throw err;
    }
  }

  async function updateProfile(fullName: string, email: string, phone?: string) {
    try {
      setError(null);
      if (!user) throw new Error('Not authenticated');
      if (!fullName.trim()) throw new Error('Full name is required');

      const metaUpdate: Record<string, any> = { full_name: fullName.trim() };
      if (phone !== undefined) metaUpdate.phone = phone.trim();

      // 1. Update Auth metadata in Supabase
      const { error: authError } = await supabase.auth.updateUser({
        email: email.trim(),
        data: metaUpdate,
      });
      if (authError) throw authError;

      // 2. Direct client update on profiles table
      const profilePayload: Record<string, any> = {
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      };
      if (phone !== undefined) profilePayload.phone = phone.trim();

      await supabase.from('profiles').update(profilePayload).eq('id', user.id);

      // 3. Fallback/Sync via backend service key to bypass any RLS policy issues
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          await fetch(`${API_URL}/api/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              full_name: fullName.trim(),
              phone: phone !== undefined ? phone.trim() : undefined,
            }),
          });
        }
      } catch (beErr) {
        console.warn('Backend profile update note:', beErr);
      }

      setUser({ ...user, full_name: fullName.trim(), ...(phone !== undefined ? { phone: phone.trim() } : {}) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
      throw err;
    }
  }

  async function uploadAvatar(file: File) {
    try {
      setError(null);
      if (!user) throw new Error('Not authenticated');

      // Accept any image type — derive extension from mime type
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg':  'jpg',
        'image/png':  'png',
        'image/gif':  'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp':  'bmp',
        'image/tiff': 'tiff',
        'image/heic': 'heic',
      };
      const ext  = mimeToExt[file.type] || file.name.split('.').pop() || 'jpg';
      // Use a fixed path per user so old files are overwritten
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust so browser shows new image immediately
      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile row — best effort, don't block on failure
      await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url }, { onConflict: 'id' });

      // Update auth metadata
      await supabase.auth.updateUser({ data: { avatar_url } });

      // Update local state immediately so UI reflects the change
      setUser(prev => prev ? { ...prev, avatar_url } : prev);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Avatar upload failed';
      setError(message);
      throw err;
    }
  }

  async function deleteAccount() {
    try {
      setError(null);
      if (!user) throw new Error('Not authenticated');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // 1. Call backend to completely delete user from profiles, payments, subscriptions, and Supabase auth
      if (token) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          await fetch(`${API_URL}/api/delete-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        } catch (apiErr) {
          console.warn('Backend delete account error:', apiErr);
        }
      }

      // 2. Direct Supabase delete attempts (client-side backup)
      try { await supabase.from('subscriptions').delete().eq('user_id', user.id); } catch {}
      try { await supabase.from('payments').delete().eq('user_id', user.id); } catch {}
      try { await supabase.from('profiles').delete().eq('id', user.id); } catch {}

      // 3. Remove avatar from storage if exists
      if (user.avatar_url) {
        try {
          const ext = user.avatar_url.split('.').pop()?.split('?')[0];
          await supabase.storage.from('avatars').remove([`avatars/${user.id}.${ext}`]);
        } catch {}
      }

      setUser(null);
      await supabase.auth.signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete account failed';
      setError(message);
      throw err;
    }
  }

  async function signOut() {
    setUser(null);
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
  }

  async function resetPassword(email: string) {
    try {
      setError(null);
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Please provide a valid email address');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(message);
      throw err;
    }
  }

  function clearError() { setError(null); }

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, signin, updateProfile, uploadAvatar, deleteAccount, signOut, clearError, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
