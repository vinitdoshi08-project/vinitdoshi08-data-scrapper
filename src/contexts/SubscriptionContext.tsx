import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL as string;

export type Plan = 'free' | 'basic' | 'standard';

export interface Subscription {
  plan: Plan;
  trial_ends_at: string | null;
  trial_active: boolean;
  can_scrape: boolean;
  expires_at: string | null;
  billing_cycle: 'monthly' | 'yearly';
  loading: boolean;
}

interface SubscriptionContextType extends Subscription {
  refresh: () => Promise<void>;
}

const defaultSub: Subscription = {
  plan: 'free',
  trial_ends_at: null,
  trial_active: true,
  can_scrape: true,
  expires_at: null,
  billing_cycle: 'monthly',
  loading: true,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  ...defaultSub,
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
  const [sub, setSub] = useState<Subscription>(defaultSub);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setSub({ ...defaultSub, loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/subscription?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setSub({ ...data, loading: false });
      } else {
        setSub({ ...defaultSub, loading: false });
      }
    } catch {
      setSub({ ...defaultSub, loading: false });
    }
  }, []);

  // Refresh whenever auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refresh();
      } else {
        setSub({ ...defaultSub, loading: false });
      }
    });
    refresh();
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

/** Human-readable plan display name */
export function planLabel(plan: Plan): string {
  const labels: Record<Plan, string> = {
    free:     'Free Forever',
    basic:    'Basic',
    standard: 'Standard',
  };
  return labels[plan] ?? plan;
}

/** Status label shown next to plan name */
export function planStatusLabel(plan: Plan, trial_active: boolean, can_scrape: boolean): string {
  if (plan !== 'free') return 'Active';
  if (trial_active) return 'Trial Active';
  return 'Expired';
}

/** Badge color classes for a plan */
export function planBadgeClass(plan: Plan): string {
  const classes: Record<Plan, string> = {
    free:     'bg-amber-50 text-amber-600 border-amber-200',
    basic:    'bg-indigo-50 text-indigo-600 border-indigo-200',
    standard: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return classes[plan] ?? '';
}

/** Status badge color classes */
export function statusBadgeClass(active: boolean): string {
  return active
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : 'bg-red-50 text-red-500 border-red-200';
}
