'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteEvent {
  id: string;
  amount: number;
  currency: string;
  outcome: string;
  processor: string;
  success: boolean;
  created_at: string;
  error?: string;
}

interface DashboardData {
  merchant: { email: string; company_name: string | null; onboarded_at: string };
  latest_report: {
    annualized_savings: number;
    merchant_net_gain: number;
    our_fee_annual: number;
    period_start: string;
    period_end: string;
    total_transactions: number;
  } | null;
  routing: {
    total_30d: number;
    optimized_30d: number;
    fallback_30d: number;
    success_rate: number | null;
    stripe_fee_baseline_30d: number;
    saving_30d: number;
    our_fee_30d: number;
  };
  circuit: { state: string; failure_count: number; last_failure_at: string | null };
  recent_events: RouteEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const outcomeLabel: Record<string, { label: string; color: string }> = {
  optimized:       { label: 'Optimized', color: 'bg-green-100 text-green-700' },
  stripe_fallback: { label: 'Fallback',  color: 'bg-yellow-100 text-yellow-700' },
  stripe_direct:   { label: 'Direct',    color: 'bg-gray-100 text-gray-600' },
};

const circuitColor: Record<string, string> = {
  closed:    'bg-green-100 text-green-700',
  open:      'bg-red-100 text-red-700',
  'half-open': 'bg-yellow-100 text-yellow-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/${merchantId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [merchantId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Loading dashboard…
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      {error || 'No data found'}
    </div>
  );

  const { merchant, latest_report: report, routing, circuit, recent_events } = data;
  const name = merchant.company_name ?? merchant.email;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-gray-900">Keepmore</span>
          <span className="text-sm text-gray-500">{name}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Savings headline */}
        {report && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-400 uppercase tracking-wide font-medium">
              Annual savings projection · based on {report.period_start} → {report.period_end}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[
                { label: 'Gross annual saving',  value: fmt(report.annualized_savings) },
                { label: 'Our fee (20%)',         value: fmt(report.our_fee_annual), muted: true },
                { label: 'Your net gain',         value: fmt(report.merchant_net_gain), highlight: true },
              ].map(({ label, value, muted, highlight }) => (
                <div
                  key={label}
                  className={`rounded-xl p-4 ${highlight ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}
                >
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-indigo-700' : muted ? 'text-gray-400' : 'text-gray-900'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 30-day routing stats */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Last 30 days · Live routing
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Transactions routed',   value: routing.total_30d.toLocaleString() },
              { label: 'Optimized (non-Stripe)', value: routing.optimized_30d.toLocaleString() },
              { label: 'Saving this month',      value: fmt(routing.saving_30d), highlight: true },
              { label: 'Our fee this month',     value: fmt(routing.our_fee_30d), muted: true },
            ].map(({ label, value, highlight, muted }) => (
              <div
                key={label}
                className={`rounded-xl p-4 border ${highlight ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-200'}`}
              >
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`mt-1 text-xl font-bold ${highlight ? 'text-indigo-700' : muted ? 'text-gray-400' : 'text-gray-900'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Circuit breaker status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Router health</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {circuit.failure_count} failure{circuit.failure_count !== 1 ? 's' : ''} recorded
              {circuit.last_failure_at && ` · last at ${fmtDate(circuit.last_failure_at)}`}
            </p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${circuitColor[circuit.state] ?? 'bg-gray-100 text-gray-600'}`}>
            {circuit.state.toUpperCase()}
          </span>
        </div>

        {/* Recent transaction log */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recent transactions
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {recent_events.length === 0 ? (
              <p className="text-sm text-gray-400 p-6">
                No routed transactions yet. Transactions will appear here once routing is live.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date', 'Amount', 'Processor', 'Outcome', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent_events.map(ev => {
                    const badge = outcomeLabel[ev.outcome] ?? { label: ev.outcome, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={ev.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {fmtDate(ev.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {fmt(ev.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">
                          {ev.processor || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {ev.success ? (
                            <span className="text-green-600 text-xs font-medium">✓ Success</span>
                          ) : (
                            <span className="text-red-500 text-xs font-medium" title={ev.error}>✗ Failed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}