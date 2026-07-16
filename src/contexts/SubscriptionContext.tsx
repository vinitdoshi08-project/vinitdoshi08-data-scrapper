import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const API_URL   = import.meta.env.VITE_API_URL as string;
const CACHE_KEY = 'scrapify_sub_cache';

export type Plan = 'free' | 'basic' | 'standard';

export interface Subscription {
  plan: Plan;
  trial_ends_at: string | null;
  trial_active: boolean;
  can_scrape: boolean;
  expires_at: string | null;
  billing_cycle: 'monthly' | 'yearly';
  loading: boolean;
  /** true only after a real network fetch has completed — never true from cache */
  freshLoaded: boolean;
}

interface SubscriptionContextType extends Subscription {
  refresh: () => Promise<void>;
}

function readCache(): Omit<Subscription, 'loading' | 'freshLoaded'> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.plan === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(sub: Omit<Subscription, 'loading' | 'freshLoaded'>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sub));
  } catch { /* quota – ignore */ }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

const noSessionState: Subscription = {
  plan: 'free',
  trial_ends_at: null,
  trial_active: false,
  can_scrape: false,
  expires_at: null,
  billing_cycle: 'monthly',
  loading: false,
  freshLoaded: false,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  ...noSessionState,
  refresh: async () => {},
});

async function getToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const cached = readCache();

  // Start from cache (instant UI) but freshLoaded=false until API confirms
  const [sub, setSub] = useState<Subscription>(
    cached
      ? { ...cached, loading: false, freshLoaded: false }
      : { ...noSessionState, loading: true, freshLoaded: false }
  );

  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const token = await getToken();

    if (!token) {
      clearCache();
      setSub({ ...noSessionState, freshLoaded: true });
      fetchingRef.current = false;
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/subscription?token=${encodeURIComponent(token)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const next: Omit<Subscription, 'loading' | 'freshLoaded'> = {
          plan:          data.plan          ?? 'free',
          trial_ends_at: data.trial_ends_at ?? null,
          trial_active:  data.trial_active  ?? false,
          can_scrape:    data.can_scrape     ?? false,
          expires_at:    data.expires_at     ?? null,
          billing_cycle: data.billing_cycle  ?? 'monthly',
        };
        writeCache(next);
        setSub({ ...next, loading: false, freshLoaded: true });
      } else {
        setSub(prev => ({ ...prev, loading: false, freshLoaded: true }));
      }
    } catch {
      setSub(prev => ({ ...prev, loading: false, freshLoaded: true }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearCache();
        fetchingRef.current = false;
        setSub({ ...noSessionState, freshLoaded: true });
      } else if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ ...sub, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function planLabel(plan: Plan): string {
  const labels: Record<Plan, string> = {
    free: 'Free', basic: 'Basic', standard: 'Standard',
  };
  return labels[plan] ?? plan;
}

export function planStatusLabel(plan: Plan, trial_active: boolean, can_scrape: boolean): string {
  if (plan !== 'free') return 'Active';
  if (trial_active) return 'Trial Active';
  return 'Expired';
}

export function planBadgeClass(plan: Plan): string {
  const classes: Record<Plan, string> = {
    free:     'bg-amber-50 text-amber-600 border-amber-200',
    basic:    'bg-indigo-50 text-indigo-600 border-indigo-200',
    standard: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return classes[plan] ?? '';
}

export function statusBadgeClass(active: boolean): string {
  return active
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : 'bg-red-50 text-red-500 border-red-200';
}
