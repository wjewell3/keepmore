'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'form' | 'ingesting' | 'error';

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>('form');
  const [email, setEmail]         = useState('');
  const [company, setCompany]     = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [progress, setProgress]   = useState(0);
  const [errorMsg, setErrorMsg]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep('ingesting');
    setProgress(10);

    try {
      // 1. Create or fetch merchant
      const merchantRes = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company_name: company }),
      });
      if (!merchantRes.ok) throw new Error('Failed to create merchant record');
      const { merchant_id } = await merchantRes.json();
      setProgress(25);

      // 2. Ingest Stripe data + generate report
      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id, stripe_key: stripeKey }),
      });
      setProgress(85);

      if (!ingestRes.ok) {
        const { error } = await ingestRes.json();
        throw new Error(error ?? 'Ingestion failed');
      }

      const { report_id } = await ingestRes.json();
      setProgress(100);

      router.push(`/report/${report_id}`);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  if (step === 'ingesting') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-6">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your transactions</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Pulling 90 days of charge history from Stripe and running the savings model…
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">{progress}% complete</p>
        </div>
      </main>
    );
  }

  if (step === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6 text-sm">{errorMsg}</p>
          <button
            onClick={() => setStep('form')}
            className="text-indigo-600 underline text-sm"
          >
            ← Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-6 py-16">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</a>

        <h1 className="mt-8 text-3xl font-bold text-gray-900">Connect your Stripe account</h1>
        <p className="mt-3 text-gray-500">
          We need a restricted API key with read-only access. You'll get your savings report in about 30 seconds.
        </p>

        {/* Key creation instructions */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-800">How to create a restricted key:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Stripe Dashboard → API keys</a></li>
            <li>Click <strong>Create restricted key</strong></li>
            <li>Enable <strong>Read</strong> for: Charges, Balance transactions, Customers</li>
            <li>Copy the key and paste it below</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name (optional)</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stripe restricted API key</label>
            <input
              type="password"
              required
              value={stripeKey}
              onChange={e => setStripeKey(e.target.value)}
              placeholder="rk_live_…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              We store this encrypted. You can revoke it in your Stripe Dashboard at any time.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Generate my savings report →
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Read-only access only. We cannot initiate payments or make changes to your Stripe account.
        </p>
      </div>
    </main>
  );
}