import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-semibold text-gray-900 text-lg">Keepmore</span>
        <Link
          href="/onboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Get your report →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          Find out how much you're overpaying Stripe
        </h1>
        <p className="mt-6 text-xl text-gray-500">
          Connect your Stripe account in 2 minutes. Get a detailed report showing
          exactly where your fees are higher than they need to be — and how much
          you'd save by routing smarter.
        </p>
        <Link
          href="/onboard"
          className="mt-10 inline-block bg-indigo-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Connect your Stripe account (read-only)
        </Link>
        <p className="mt-4 text-sm text-gray-400">
          Free report. No card required. Takes 2 minutes.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8 border-t border-gray-100">
        {[
          {
            step: '01',
            title: 'Paste your restricted key',
            body: 'We walk you through creating a read-only key in your Stripe Dashboard. We request three permissions: Charges, Balance transactions, and Customers.',
          },
          {
            step: '02',
            title: 'We analyze 90 days of data',
            body: 'Our engine categorizes every transaction — EU cards, ACH-eligible B2B payments, and standard domestic charges — and computes what each would cost on cheaper rails.',
          },
          {
            step: '03',
            title: 'You get a concrete dollar number',
            body: 'Your personalized report shows the exact annual saving, broken down by category. If the number is big enough, we can automate the switch.',
          },
        ].map(({ step, title, body }) => (
          <div key={step}>
            <span className="text-3xl font-bold text-indigo-100">{step}</span>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-gray-500 text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* Trust strip */}
      <section className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-center text-sm text-gray-500">
          {[
            '🔒 Read-only API access — we cannot move money or make changes',
            '💳 We never see card numbers or sensitive cardholder data',
            '💰 Performance fee only: we charge 20% of actual savings, billed monthly',
          ].map(t => (
            <span key={t} className="flex items-start gap-2">{t}</span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Keepmore. Not affiliated with Stripe, Inc.
      </footer>
    </main>
  );
}