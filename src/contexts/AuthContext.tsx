import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  updateProfile: (fullName: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
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
    try {
      // Optimistic UI update: Set user immediately deeply based on metadata so they don't wait for the DB query to login successfully
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        created_at: authUser.created_at,
      });

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || '',
          created_at: authUser.created_at,
        });
      } else if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || '',
          created_at: profile.created_at,
        });
      }
    } catch (err) {
      console.error(err);
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

      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (signupError) throw signupError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      throw err;
    }
  }

  async function signin(email: string, password: string) {
    try {
      setError(null);
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email format');
      if (!password) throw new Error('Password is required');

      const { error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signinError) throw signinError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }

  async function updateProfile(fullName: string, email: string) {
    try {
      setError(null);
      if (!user) throw new Error('Not authenticated');
      if (!fullName.trim()) throw new Error('Full name is required');

      const { error: authError } = await supabase.auth.updateUser({
        email: email.trim(),
        data: { full_name: fullName.trim() }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      setUser({ ...user, full_name: fullName.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
      throw err;
    }
  }

  async function signOut() {
    setUser(null); // Clear UI immediately for instant logout feeling
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signup, signin, updateProfile, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
