import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const API_URL   = import.meta.env.VITE_API_URL as string;
const CACHE_KEY = 'scrapify_sub_cache_v2'; // bumped version clears old stale cache

export type Plan = 'free' | 'basic' | 'standard';

export interface Subscription {
  plan: Plan;
  trial_ends_at: string | null;
  trial_active: boolean;
  can_scrape: boolean;
  expires_at: string | null;
  billing_cycle: 'monthly' | 'yearly';
  upcoming_plan: Plan | null;
  upcoming_billing: 'monthly' | 'yearly' | null;
  upcoming_starts_at: string | null;
  auto_renew: boolean;
  razorpay_sub_id: string | null;
  loading: boolean;
  freshLoaded: boolean;
}

interface SubscriptionContextType extends Subscription {
  refresh: () => Promise<void>;
}

function writeCache(sub: Omit<Subscription, 'loading' | 'freshLoaded'>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(sub)); } catch { /* quota */ }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    // also clear old key name
    localStorage.removeItem('scrapify_sub_cache');
  } catch { /* ignore */ }
}

const defaultState: Subscription = {
  plan: 'free',
  trial_ends_at: null,
  trial_active: false,
  can_scrape: false,
  expires_at: null,
  billing_cycle: 'monthly',
  upcoming_plan: null,
  upcoming_billing: null,
  upcoming_starts_at: null,
  auto_renew: false,
  razorpay_sub_id: null,
  loading: true,
  freshLoaded: false,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  ...defaultState,
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
  // Always start loading — never trust cache for initial render
  const [sub, setSub] = useState<Subscription>({ ...defaultState });
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSub(prev => ({ ...prev, loading: true }));

    const token = await getToken();

    if (!token) {
      clearCache();
      setSub({ ...defaultState, loading: false, freshLoaded: true, can_scrape: false });
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/subscription?token=${encodeURIComponent(token)}`,
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      if (res.ok) {
        const data = await res.json();
        const next: Omit<Subscription, 'loading' | 'freshLoaded'> = {
          plan:               (data.plan               ?? 'free') as Plan,
          trial_ends_at:      data.trial_ends_at       ?? null,
          trial_active:       data.trial_active        ?? false,
          can_scrape:         data.can_scrape           ?? false,
          expires_at:         data.expires_at           ?? null,
          billing_cycle:      (data.billing_cycle      ?? 'monthly') as 'monthly' | 'yearly',
          upcoming_plan:      data.upcoming_plan        ?? null,
          upcoming_billing:   data.upcoming_billing     ?? null,
          upcoming_starts_at: data.upcoming_starts_at   ?? null,
          auto_renew:         data.auto_renew           ?? false,
          razorpay_sub_id:    data.razorpay_sub_id      ?? null,
        };
        writeCache(next);
        setSub({ ...next, loading: false, freshLoaded: true });
      } else {
        setSub(prev => ({ ...prev, loading: false, freshLoaded: true }));
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setSub(prev => ({ ...prev, loading: false, freshLoaded: true }));
    }
  }, []);

  useEffect(() => {
    // Always fetch fresh on mount
    refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearCache();
        setSub({ ...defaultState, loading: false, freshLoaded: true, can_scrape: false });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (abortRef.current) abortRef.current.abort();
    };
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

export function planLabel(plan: Plan | string | null): string {
  const labels: Record<string, string> = { free: 'Free', basic: 'Basic', standard: 'Standard' };
  return labels[plan ?? 'free'] ?? String(plan ?? 'Free');
}

export function planBadgeClass(plan: Plan | string | null): string {
  const classes: Record<string, string> = {
    free:     'bg-amber-50 text-amber-600 border-amber-200',
    basic:    'bg-[oklch(0.94_0.035_270)] text-[oklch(0.35_0.11_275)] border-[oklch(0.88_0.05_270)]',
    standard: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return classes[plan ?? 'free'] ?? classes.free;
}

export function statusBadgeClass(active: boolean): string {
  return active
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : 'bg-red-50 text-red-500 border-red-200';
}

export function planRank(plan: Plan | string | null): number {
  const ranks: Record<string, number> = { free: 0, basic: 1, standard: 2 };
  return ranks[plan ?? 'free'] ?? 0;
}
