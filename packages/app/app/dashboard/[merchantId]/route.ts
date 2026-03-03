import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(_req: Request, { params }: { params: { merchantId: string } }) {
  const { merchantId } = params;

  const [merchantRes, reportRes, routeStatsRes, recentEventsRes, circuitRes] =
    await Promise.all([
      supabase
        .from('merchants')
        .select('id, email, company_name, onboarded_at')
        .eq('id', merchantId)
        .single(),

      supabase
        .from('savings_reports')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Aggregate route outcomes for last 30 days
      supabase
        .from('route_events')
        .select('outcome, success, amount, stripe_fee_estimate')
        .eq('merchant_id', merchantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Recent 20 transactions for the table
      supabase
        .from('route_events')
        .select('id, amount, currency, outcome, processor, success, created_at, error')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('circuit_breaker_state')
        .select('state, failure_count, last_failure_at')
        .eq('merchant_id', merchantId)
        .single(),
    ]);

  if (merchantRes.error) {
    return Response.json({ error: 'Merchant not found' }, { status: 404 });
  }

  // Compute 30-day routing stats
  const events = routeStatsRes.data ?? [];
  const optimized  = events.filter(e => e.outcome === 'optimized');
  const fallbacks  = events.filter(e => e.outcome !== 'optimized');
  const stripeFeeTotal = events.reduce((s, e) => s + (e.stripe_fee_estimate ?? 0), 0);
  // For optimized routes we estimate actual fee is ~20% of Stripe's fee (rough EU/ACH saving)
  const actualFeeEstimate = optimized.reduce(
    (s, e) => s + Math.round((e.stripe_fee_estimate ?? 0) * 0.2), 0
  ) + fallbacks.reduce((s, e) => s + (e.stripe_fee_estimate ?? 0), 0);
  const saving30d  = Math.max(0, stripeFeeTotal - actualFeeEstimate);
  const ourFee30d  = Math.round(saving30d * 0.2);

  return Response.json({
    merchant:     merchantRes.data,
    latest_report: reportRes.data ?? null,
    routing: {
      total_30d:      events.length,
      optimized_30d:  optimized.length,
      fallback_30d:   fallbacks.length,
      success_rate:   events.length
        ? Math.round((events.filter(e => e.success).length / events.length) * 100)
        : null,
      stripe_fee_baseline_30d: stripeFeeTotal,
      saving_30d:     saving30d,
      our_fee_30d:    ourFee30d,
    },
    circuit: circuitRes.data ?? { state: 'closed', failure_count: 0, last_failure_at: null },
    recent_events: recentEventsRes.data ?? [],
  });
}