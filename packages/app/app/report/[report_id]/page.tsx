import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ReportData {
  id: string;
  merchant_id: string;
  period_start: string;
  period_end: string;
  period_days: number;
  total_transactions: number;
  total_fees_paid: number;
  total_fees_optimized: number;
  period_savings: number;
  annualized_savings: number;
  our_fee_annual: number;
  merchant_net_gain: number;
  eu_count: number;
  eu_savings: number;
  ach_count: number;
  ach_savings: number;
  standard_count: number;
  standard_savings: number;
  report_json: any;
  created_at: string;
}

export default async function ReportPage({ params }: { params: { report_id: string } }) {
  const supabase = getSupabaseClient();
  
  const { data: report, error } = await supabase
    .from('savings_reports')
    .select('*')
    .eq('id', params.report_id)
    .single();

  if (error || !report) {
    notFound();
  }

  const reportData = report as ReportData;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full mb-4">
            ✓ Analysis Complete
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Your Payment Processing Savings Report
          </h1>
          <p className="text-gray-600">
            {reportData.period_days}-day analysis • {reportData.total_transactions.toLocaleString()} transactions
          </p>
        </div>

        {/* Big Numbers */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 divide-x divide-indigo-400">
            <div className="text-center">
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide mb-2">
                Savings Over {reportData.period_days} Days
              </p>
              <p className="text-5xl font-bold mb-2">
                {formatCurrency(Math.round(reportData.period_savings * 0.80))}
              </p>
              <p className="text-indigo-200 text-sm">
                Based on your actual transaction data
              </p>
            </div>
            <div className="text-center">
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wide mb-2">
                Projected Annual Savings
              </p>
              <p className="text-5xl font-bold mb-2">
                {formatCurrency(reportData.merchant_net_gain)}
              </p>
              <p className="text-indigo-200 text-sm">
                Money back in your pocket
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-500 text-sm font-medium mb-1">What You Paid (Current)</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(reportData.total_fees_paid)}</p>
            <p className="text-xs text-gray-500 mt-1">Over {reportData.period_days} days</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-500 text-sm font-medium mb-1">What You'd Pay (KeepMore)</p>
            <p className="text-3xl font-bold text-indigo-600">{formatCurrency(reportData.total_fees_optimized + Math.round(reportData.period_savings * 0.20))}</p>
            <p className="text-xs text-gray-500 mt-1">Over {reportData.period_days} days</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-500 text-sm font-medium mb-1">Your Savings</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(Math.round(reportData.period_savings * 0.80))}</p>
            <p className="text-xs text-gray-500 mt-1">Over {reportData.period_days} days</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">💡 How We Calculate Your Savings</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>Period analysis:</strong> We analyzed {reportData.total_transactions.toLocaleString()} transaction{reportData.total_transactions !== 1 ? 's' : ''} 
              from the past {reportData.period_days} days. You paid {formatCurrency(reportData.total_fees_paid)} in total processing costs. 
              With KeepMore, you'd pay {formatCurrency(reportData.total_fees_optimized + Math.round(reportData.period_savings * 0.20))}, 
              saving you {formatCurrency(Math.round(reportData.period_savings * 0.80))}.
            </p>
            <p>
              <strong>Annual projection:</strong> If you continue processing similar transactions, you'll save 
              approximately {formatCurrency(reportData.merchant_net_gain)}/year with KeepMore.
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Savings Breakdown (Projected Annual)</h2>
          
          <div className="space-y-6">
            {/* EU Cards */}
            {reportData.eu_count > 0 && (
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">🇪🇺 EU Card Transactions</h3>
                    <p className="text-sm text-gray-600">{reportData.eu_count.toLocaleString()} transaction{reportData.eu_count !== 1 ? 's' : ''} in {reportData.period_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(Math.round(reportData.eu_savings * (365 / reportData.period_days) * 0.80))}</p>
                    <p className="text-xs text-gray-500">projected annual</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Lower interchange fees for EU cards (0.6% + $0.10 vs Stripe's 2.9% + $0.30).
                </p>
              </div>
            )}

            {/* ACH */}
            {reportData.ach_count > 0 && (
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">🏦 ACH-Eligible Transactions</h3>
                    <p className="text-sm text-gray-600">{reportData.ach_count.toLocaleString()} transaction{reportData.ach_count !== 1 ? 's' : ''} in {reportData.period_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(Math.round(reportData.ach_savings * (365 / reportData.period_days) * 0.80))}</p>
                    <p className="text-xs text-gray-500">projected annual</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Large recurring transactions ($500+) from known customers can use ACH at $0.25 flat fee.
                </p>
              </div>
            )}

            {/* Standard */}
            {reportData.standard_count > 0 && (
              <div className="border-l-4 border-gray-300 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">💳 Standard Transactions</h3>
                    <p className="text-sm text-gray-600">{reportData.standard_count.toLocaleString()} transaction{reportData.standard_count !== 1 ? 's' : ''} in {reportData.period_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-600">{formatCurrency(Math.round(reportData.standard_savings * (365 / reportData.period_days) * 0.80))}</p>
                    <p className="text-xs text-gray-500">projected annual</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Negotiated rates (2.4% + $0.25) and volume discounts for remaining transactions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Our Fee - removed separate section, it's already shown in the blue box above */}

        {/* CTA */}
        <div className="bg-indigo-50 rounded-xl p-8 text-center border border-indigo-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {reportData.merchant_net_gain > 0 
              ? `Ready to save ${formatCurrency(reportData.merchant_net_gain)}/year?`
              : "Want to see how this scales with real volume?"}
          </h3>
          <p className="text-gray-600 mb-6">
            {reportData.total_transactions < 10 
              ? "This report is based on limited test data. Let's analyze your full transaction history to get accurate projections."
              : "Let's schedule a quick call to walk through the integration. No commitment required."}
          </p>
          <a 
            href="https://cal.com/keepmore/onboarding" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Schedule a Call →
          </a>
          <p className="text-xs text-gray-500 mt-4">
            Or email us at hello@keepmorecash.com
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-400">
          <p>Report generated {new Date(reportData.created_at).toLocaleDateString()}</p>
          <p className="mt-2">
            <a href="/" className="text-indigo-600 hover:underline">← Back to home</a>
          </p>
        </div>
      </div>
    </main>
  );
}
