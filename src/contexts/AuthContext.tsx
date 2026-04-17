import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await fetch(`${API_URL}/api/auth/me?token=${token}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  async function signup(fullName: string, email: string, password: string) {
    try {
      setError(null);

      if (!fullName.trim()) throw new Error('Full name is required');
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email format');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }

      // We don't log in immediately if the user wants "Account created successfully. Please log in."
      // But the requirement says "Show success message: Account created successfully. Please log in."
      // The Signup.tsx component handles the redirect to /login.
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

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid email or password');
      }

      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }

  async function updateProfile(fullName: string, email: string) {
    try {
      setError(null);
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      if (!fullName.trim()) throw new Error('Full name is required');
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email format');

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          token
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update profile');
      }

      // Update local state
      if (user) {
        setUser({ ...user, full_name: fullName.trim(), email: email.toLowerCase().trim() });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
      throw err;
    }
  }

  async function signOut() {
    setUser(null);
    localStorage.removeItem('auth_token');
    setError(null);
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
