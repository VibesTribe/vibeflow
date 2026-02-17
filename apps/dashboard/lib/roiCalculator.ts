/**
 * ROI Calculator Utilities
 * 
 * Handles:
 * - Exchange rate fetching (USD → CAD)
 * - Cost formatting
 * - ROI calculations for dashboard
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { ROITotals, SliceROI, SubscriptionROI } from "./vibepilotAdapter";

export interface ExchangeRate {
  rate: number;
  fetched_at: string;
  source: string;
}

const CACHE_KEY = "vibepilot_exchange_rate";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch exchange rate from API
 */
export async function fetchExchangeRate(): Promise<ExchangeRate> {
  // Check cache first
  const cached = getCachedExchangeRate();
  if (cached) {
    return cached;
  }

  // Try to fetch from Supabase first
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("id", "usd_cad")
        .single();

      if (!error && data) {
        const result: ExchangeRate = {
          rate: data.rate,
          fetched_at: data.fetched_at,
          source: data.source,
        };
        cacheExchangeRate(result);
        return result;
      }
    } catch (e) {
      console.warn("[roi] Failed to fetch exchange rate from Supabase:", e);
    }
  }

  // Fallback to exchangerate-api.com (free tier)
  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    if (response.ok) {
      const data = await response.json();
      const cadRate = data.rates?.CAD;
      if (cadRate) {
        const result: ExchangeRate = {
          rate: cadRate,
          fetched_at: new Date().toISOString(),
          source: "exchangerate-api.com",
        };
        cacheExchangeRate(result);
        
        // Try to persist to Supabase (fire and forget)
        if (isSupabaseConfigured() && supabase) {
          void supabase
            .from("exchange_rates")
            .upsert({
              id: "usd_cad",
              rate: cadRate,
              fetched_at: result.fetched_at,
              source: result.source,
            });
        }
        
        return result;
      }
    }
  } catch (e) {
    console.warn("[roi] Failed to fetch from exchange API:", e);
  }

  // Final fallback
  return {
    rate: 1.36,
    fetched_at: new Date().toISOString(),
    source: "fallback",
  };
}

function getCachedExchangeRate(): ExchangeRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    
    const cached = JSON.parse(raw) as ExchangeRate;
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    
    if (age < CACHE_TTL_MS) {
      return cached;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function cacheExchangeRate(rate: ExchangeRate): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rate));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Convert USD to CAD
 */
export function usdToCad(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: "USD" | "CAD" = "USD"
): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return formatter.format(amount);
}

/**
 * Format tokens with K/M suffix
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate ROI percentage
 */
export function calculateROIPercent(
  savings: number,
  actual: number
): number {
  if (actual <= 0) return 0;
  return Math.round((savings / actual) * 100 * 10) / 10;
}

/**
 * Get recommendation label and color
 */
export function getRecommendationMeta(recommendation: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (recommendation) {
    case "expired":
      return { label: "Expired", color: "#ef4444", icon: "!" };
    case "renew_soon":
      return { label: "Renew Soon", color: "#f59e0b", icon: "!" };
    case "good_value_renew":
      return { label: "Good Value", color: "#22c55e", icon: "+" };
    default:
      return { label: "Evaluate", color: "#6b7280", icon: "?" };
  }
}

/**
 * Aggregate ROI totals from slices
 */
export function aggregateSliceROI(slices: SliceROI[]): ROITotals {
  return slices.reduce(
    (acc, slice) => ({
      total_tokens: acc.total_tokens + slice.total_tokens_in + slice.total_tokens_out,
      total_theoretical_usd: acc.total_theoretical_usd + slice.theoretical_cost_usd,
      total_actual_usd: acc.total_actual_usd + slice.actual_cost_usd,
      total_savings_usd: acc.total_savings_usd + slice.savings_usd,
      total_tasks: acc.total_tasks + slice.total_tasks,
      total_completed: acc.total_completed + slice.completed_tasks,
    }),
    {
      total_tokens: 0,
      total_theoretical_usd: 0,
      total_actual_usd: 0,
      total_savings_usd: 0,
      total_tasks: 0,
      total_completed: 0,
    }
  );
}

/**
 * Subscription summary
 */
export function getSubscriptionSummary(subscriptions: SubscriptionROI[]): {
  totalMonthlyCost: number;
  totalTasksCompleted: number;
  avgCostPerTask: number;
  expiringWithin7Days: number;
} {
  const totalMonthlyCost = subscriptions.reduce(
    (sum, s) => sum + (s.subscription_cost_usd || 0),
    0
  );
  const totalTasksCompleted = subscriptions.reduce(
    (sum, s) => sum + s.tasks_completed,
    0
  );
  const avgCostPerTask =
    totalTasksCompleted > 0 ? totalMonthlyCost / totalTasksCompleted : 0;
  const expiringWithin7Days = subscriptions.filter(
    s => s.days_remaining <= 7
  ).length;

  return {
    totalMonthlyCost,
    totalTasksCompleted,
    avgCostPerTask,
    expiringWithin7Days,
  };
}

/**
 * Hook-style getter for exchange rate
 */
export async function getExchangeRate(): Promise<number> {
  const result = await fetchExchangeRate();
  return result.rate;
}
