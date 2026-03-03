export const dynamic = "force-dynamic";
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const pct = (part: number, total: number) =>
  total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;

interface Props {
  params: { id: string };
}

export default async function ReportPage({ params }: Props) {
  const { data: report, error } = await supabase
    .from('savings_reports')
    .select('*, merchants(company_name, email)')
    .eq('id', params.id)
    .single();

  if (error || !report) notFound();

  const merchant = report.merchants as { company_name: string | null; email: string };
  const name = merchant.company_name ?? merchant.email;

  const categories = [
    {
      icon: '🇪🇺',
      label: 'EU Card Transactions',
      description: 'Routed through a local EU acquirer (interchange-capped rates)',
      count: report.eu_count,
      paid: report.eu_fees_paid,
      optimized: report.eu_fees_optimized,
      savings: report.eu_savings,
      annualized: Math.round(report.eu_savings * (365 / report.period_days)),
      highlight: true,
    },
    {
      icon: '🏦',
      label: 'ACH-Eligible B2B Payments',
      description: 'Recurring USD charges over $500 that could move to direct ACH',
      count: report.ach_count,
      paid: report.ach_fees_paid,
      optimized: report.ach_fees_optimized,
      savings: report.ach_savings,
      annualized: Math.round(report.ach_savings * (365 / report.period_days)),
      highlight: false,
    },
    {
      icon: '💳',
      label: 'Standard Card Routing',
      description: 'Domestic cards routed to lower-margin alternative processor',
      count: report.standard_count,
      paid: report.standard_count > 0
        ? report.total_fees_paid - report.eu_fees_paid - report.ach_fees_paid
        : 0,
      optimized: null,
      savings: report.standard_savings,
      annualized: Math.round(report.standard_savings * (365 / report.period_days)),
      highlight: false,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">Keepmore</Link>
          <span className="text-sm text-gray-400">
            {report.period_start} → {report.period_end}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* Headline card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Stripe Fee Analysis — {name}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            You could save{' '}
            <span className="text-indigo-600">{fmt(report.annualized_savings)}</span>
            {' '}per year
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Based on {report.total_transactions.toLocaleString()} transactions over the last{' '}
            {report.period_days} days. Annualized at the same run rate.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Fees paid to Stripe', value: fmt(report.total_fees_paid) },
              { label: 'With optimized routing', value: fmt(report.total_fees_optimized) },
              { label: 'Annual gross saving', value: fmt(report.annualized_savings) },
              { label: 'Your net gain (after our 20%)', value: fmt(report.merchant_net_gain), big: true },
            ].map(({ label, value, big }) => (
              <div key={label} className={`rounded-xl p-4 ${big ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`mt-1 text-xl font-bold ${big ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        {categories.map(cat => (
          <div
            key={cat.label}
            className={`bg-white rounded-2xl shadow-sm border p-6 ${cat.highlight ? 'border-indigo-200' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {cat.icon} {cat.label}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">{cat.description}</p>
              </div>
              {cat.highlight && (
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  Biggest opportunity
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Transactions</p>
                <p className="font-semibold text-gray-900">{cat.count.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{pct(cat.count, report.total_transactions)} of total</p>
              </div>
              <div>
                <p className="text-gray-400">Paid to Stripe</p>
                <p className="font-semibold text-gray-900">{fmt(cat.paid)}</p>
              </div>
              {cat.optimized !== null && (
                <div>
                  <p className="text-gray-400">Optimized cost</p>
                  <p className="font-semibold text-green-600">{fmt(cat.optimized)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400">Annual saving</p>
                <p className={`text-xl font-bold ${cat.highlight ? 'text-indigo-600' : 'text-gray-900'}`}>
                  {fmt(cat.annualized)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Pricing + CTA */}
        <div className="bg-gray-900 text-white rounded-2xl p-8">
          <h2 className="text-xl font-bold">How we charge</h2>
          <p className="mt-2 text-gray-300 text-sm">
            We take 20% of the savings we actually deliver, billed monthly. If the routing doesn't save you money, you pay nothing.
          </p>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <p className="text-gray-400">Annual gross saving</p>
              <p className="text-2xl font-bold text-white">{fmt(report.annualized_savings)}</p>
            </div>
            <div>
              <p className="text-gray-400">Our fee (20%)</p>
              <p className="text-2xl font-bold text-gray-300">{fmt(report.our_fee_annual)}</p>
            </div>
            <div>
              <p className="text-gray-400">Your net gain</p>
              <p className="text-2xl font-bold text-green-400">{fmt(report.merchant_net_gain)}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:hello@payoptimizer.com?subject=Savings report — ${name}&body=I've seen my report (${params.id}) and I'm interested in getting started.`}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-center transition-colors"
            >
              Get started →
            </a>
            <button className="border border-gray-600 hover:border-gray-400 text-gray-300 px-6 py-3 rounded-xl text-sm transition-colors">
              Download PDF report
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-8">
          Savings estimates use published interchange caps and processor rate cards. Actual savings may vary by card mix and volume tier.
          We never store card numbers or have access to your funds.
        </p>
      </div>
    </main>
  );
}