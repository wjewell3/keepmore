// Run with: npx ts-node lib/savings-calculator.test.ts
import { aggregateSavings, StripeTransaction } from './savings-calculator';

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const MOCK_TRANSACTIONS: StripeTransaction[] = [
  // ── EU Cards (should route to local EU acquirer) ──────────────────────────
  { stripe_charge_id: 'ch_eu_01', amount: 250000, fee_paid: 7280, currency: 'eur', card_country: 'DE', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_001' },
  { stripe_charge_id: 'ch_eu_02', amount: 89000,  fee_paid: 2611, currency: 'eur', card_country: 'FR', card_funding: 'debit',   card_network: 'mastercard', payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_002' },
  { stripe_charge_id: 'ch_eu_03', amount: 450000, fee_paid:13080, currency: 'eur', card_country: 'NL', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_003' },
  { stripe_charge_id: 'ch_eu_04', amount: 32000,  fee_paid:  958, currency: 'eur', card_country: 'ES', card_funding: 'debit',   card_network: 'mastercard', payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_004' },
  { stripe_charge_id: 'ch_eu_05', amount: 175000, fee_paid: 5105, currency: 'eur', card_country: 'IT', card_funding: 'credit',  card_network: 'amex',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_005' },
  { stripe_charge_id: 'ch_eu_06', amount: 620000, fee_paid:18010, currency: 'eur', card_country: 'SE', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_006' },
  { stripe_charge_id: 'ch_eu_07', amount: 9800,   fee_paid:  314, currency: 'eur', card_country: 'BE', card_funding: 'debit',   card_network: 'mastercard', payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_007' },

  // ── ACH-eligible (recurring USD card over $500, should be ACH) ───────────
  { stripe_charge_id: 'ch_ac_01', amount: 150000, fee_paid: 4380, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_010' },
  { stripe_charge_id: 'ch_ac_02', amount: 250000, fee_paid: 7280, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'mastercard', payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_011' },
  { stripe_charge_id: 'ch_ac_03', amount: 75000,  fee_paid: 2205, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_012' },
  { stripe_charge_id: 'ch_ac_04', amount: 500000, fee_paid:14530, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: true,  customer_id: 'cus_013' },

  // ── Already on ACH (no saving) ───────────────────────────────────────────
  { stripe_charge_id: 'ch_ba_01', amount: 200000, fee_paid:  500, currency: 'usd', card_country: 'US', card_funding: '',        card_network: '',           payment_method_type: 'us_bank_account', is_recurring: true,  customer_id: 'cus_020' },
  { stripe_charge_id: 'ch_ba_02', amount: 85000,  fee_paid:  500, currency: 'usd', card_country: 'US', card_funding: '',        card_network: '',           payment_method_type: 'us_bank_account', is_recurring: true,  customer_id: 'cus_021' },

  // ── Standard US cards ────────────────────────────────────────────────────
  { stripe_charge_id: 'ch_us_01', amount: 4900,   fee_paid:  172, currency: 'usd', card_country: 'US', card_funding: 'debit',   card_network: 'visa',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_030' },
  { stripe_charge_id: 'ch_us_02', amount: 12000,  fee_paid:  378, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'mastercard', payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_031' },
  { stripe_charge_id: 'ch_us_03', amount: 3500,   fee_paid:  132, currency: 'usd', card_country: 'US', card_funding: 'debit',   card_network: 'visa',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_032' },
  { stripe_charge_id: 'ch_us_04', amount: 29900,  fee_paid:  897, currency: 'usd', card_country: 'CA', card_funding: 'credit',  card_network: 'visa',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_033' },
  { stripe_charge_id: 'ch_us_05', amount: 7500,   fee_paid:  248, currency: 'usd', card_country: 'US', card_funding: 'prepaid', card_network: 'mastercard', payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_034' },
  { stripe_charge_id: 'ch_us_06', amount: 49900,  fee_paid: 1478, currency: 'usd', card_country: 'US', card_funding: 'credit',  card_network: 'amex',       payment_method_type: 'card',           is_recurring: false, customer_id: 'cus_035' },
];

const PERIOD_DAYS = 90;
const report = aggregateSavings(MOCK_TRANSACTIONS, PERIOD_DAYS);

const line = (char = '─', len = 52) => char.repeat(len);

console.log('\n' + line('═'));
console.log('  PAYMENT OPTIMIZER — SAVINGS REPORT (90-day sample)');
console.log(line('═'));

console.log(`\n  Transactions analyzed : ${report.total_transactions}`);
console.log(`  Total fees paid       : ${fmt(report.total_fees_paid)}`);
console.log(`  Total fees (optimized): ${fmt(report.total_fees_optimized)}`);
console.log(`  Period saving         : ${fmt(report.period_savings)}`);

console.log('\n' + line());
console.log('  🇪🇺  EU CARD TRANSACTIONS');
console.log(line());
console.log(`  Count                 : ${report.eu.count}`);
console.log(`  Fees paid to Stripe   : ${fmt(report.eu.fees_paid)}`);
console.log(`  With EU local routing : ${fmt(report.eu.fees_optimized)}`);
console.log(`  Period saving         : ${fmt(report.eu.savings)}`);

console.log('\n' + line());
console.log('  🏦  ACH-ELIGIBLE B2B PAYMENTS');
console.log(line());
console.log(`  Count                 : ${report.ach.count}`);
console.log(`  Fees paid to Stripe   : ${fmt(report.ach.fees_paid)}`);
console.log(`  With direct ACH       : ${fmt(report.ach.fees_optimized)}`);
console.log(`  Period saving         : ${fmt(report.ach.savings)}`);

console.log('\n' + line());
console.log('  💳  STANDARD CARD ROUTING');
console.log(line());
console.log(`  Count                 : ${report.standard.count}`);
console.log(`  Fees paid to Stripe   : ${fmt(report.standard.fees_paid)}`);
console.log(`  With alt routing      : ${fmt(report.standard.fees_optimized)}`);
console.log(`  Period saving         : ${fmt(report.standard.savings)}`);

console.log('\n' + line('═'));
console.log('  ANNUALIZED PROJECTION');
console.log(line('═'));
console.log(`  Gross annual saving   : ${fmt(report.annualized_savings)}`);
console.log(`  Our fee (20%)         : ${fmt(report.our_fee_annual)}`);
console.log(`  YOUR NET GAIN         : ${fmt(report.merchant_net_gain)} / year`);
console.log(line('═') + '\n');

// Per-transaction breakdown
console.log('  TRANSACTION BREAKDOWN');
console.log(line());
console.log('  ID            Category       Paid      Optimized  Saving');
console.log(line());
for (const r of report.breakdown) {
  const cat = r.category.padEnd(14);
  const paid = fmt(r.fee_paid).padStart(9);
  const opt  = fmt(r.fee_optimized).padStart(9);
  const sav  = fmt(r.saving).padStart(9);
  console.log(`  ${r.transaction_id.padEnd(13)} ${cat} ${paid}  ${opt} ${sav}`);
}
console.log(line() + '\n');