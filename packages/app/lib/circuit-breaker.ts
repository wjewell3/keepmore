// In-memory circuit breaker per merchant.
// State is stored in Supabase so it survives serverless cold starts.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const FAILURE_THRESHOLD  = 5;
const RECOVERY_WINDOW_MS = 30 * 60 * 1000; // 30 min
const ROUTE_TIMEOUT_MS   = 5_000;           // 5s before fallback

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitStatus {
  state: CircuitState;
  failure_count: number;
  last_failure_at: string | null;
}

// ── Supabase table (add to migration) ────────────────────────────────────────
// create table circuit_breaker_state (
//   merchant_id     uuid primary key references merchants(id),
//   state           text default 'closed',
//   failure_count   integer default 0,
//   last_failure_at timestamptz
// );

async function getState(merchantId: string): Promise<CircuitStatus> {
  const { data } = await supabase
    .from('circuit_breaker_state')
    .select('state, failure_count, last_failure_at')
    .eq('merchant_id', merchantId)
    .single();

  if (!data) return { state: 'closed', failure_count: 0, last_failure_at: null };

  // Auto-recover: if open and recovery window has passed, move to half-open
  if (data.state === 'open' && data.last_failure_at) {
    const elapsed = Date.now() - new Date(data.last_failure_at).getTime();
    if (elapsed > RECOVERY_WINDOW_MS) {
      await setState(merchantId, 'half-open', data.failure_count, data.last_failure_at);
      return { ...data, state: 'half-open' };
    }
  }

  return data as CircuitStatus;
}

async function setState(
  merchantId: string,
  state: CircuitState,
  failureCount: number,
  lastFailureAt: string | null
) {
  await supabase
    .from('circuit_breaker_state')
    .upsert({
      merchant_id:     merchantId,
      state,
      failure_count:   failureCount,
      last_failure_at: lastFailureAt,
    }, { onConflict: 'merchant_id' });
}

export async function recordSuccess(merchantId: string) {
  await setState(merchantId, 'closed', 0, null);
}

export async function recordFailure(merchantId: string) {
  const current = await getState(merchantId);
  const newCount = current.failure_count + 1;
  const now      = new Date().toISOString();

  if (newCount >= FAILURE_THRESHOLD) {
    console.warn(`[circuit-breaker] OPEN for merchant ${merchantId} after ${newCount} failures`);
    await setState(merchantId, 'open', newCount, now);
  } else {
    await setState(merchantId, 'closed', newCount, now);
  }
}

export async function shouldRoute(merchantId: string): Promise<boolean> {
  const { state } = await getState(merchantId);
  // Allow attempt in half-open (probe), block in open
  return state !== 'open';
}

export { ROUTE_TIMEOUT_MS };