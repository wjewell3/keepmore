const EU_COUNTRIES = [
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT',
  'NL','PL','PT','RO','SE','SI','SK'
];

const RATES = {
  stripe: {
    card_percentage: 0.029,
    card_fixed: 30,
    ach_percentage: 0.008,
    ach_cap: 500,
  },
  eu_local: {
    card_percentage: 0.006,
    card_fixed: 10,
  },
  ach_direct: {
    fixed: 25,
  },
  standard_alt: {
    card_percentage: 0.024,
    card_fixed: 25,
  },
};

export interface StripeTransaction {
  stripe_charge_id: string;
  amount: number;        // cents
  fee_paid: number;      // cents
  currency: string;
  card_country: string;
  card_funding: string;  // credit | debit | prepaid
  card_network: string;
  payment_method_type: string; // card | us_bank_account
  is_recurring: boolean;
  customer_id: string;
}

export type TransactionCategory = 'eu_card' | 'ach_eligible' | 'already_ach' | 'standard';

export interface SavingsResult {
  transaction_id: string;
  category: TransactionCategory;
  amount: number;
  fee_paid: number;
  fee_optimized: number;
  saving: number;
}

export interface EUSummary {
  count: number;
  fees_paid: number;
  fees_optimized: number;
  savings: number;
}

export interface ACHSummary {
  count: number;
  fees_paid: number;
  fees_optimized: number;
  savings: number;
}

export interface StandardSummary {
  count: number;
  fees_paid: number;
  fees_optimized: number;
  savings: number;
}

export interface SavingsReport {
  period_days: number;
  total_transactions: number;
  total_fees_paid: number;
  total_fees_optimized: number;
  period_savings: number;
  annualized_savings: number;
  our_fee_annual: number;
  merchant_net_gain: number;
  eu: EUSummary;
  ach: ACHSummary;
  standard: StandardSummary;
  breakdown: SavingsResult[];
}

export function calculateTransactionSaving(tx: StripeTransaction): SavingsResult {
  const base = {
    transaction_id: tx.stripe_charge_id,
    amount: tx.amount,
    fee_paid: tx.fee_paid,
  };

  if (tx.payment_method_type === 'us_bank_account') {
    return { ...base, category: 'already_ach', fee_optimized: tx.fee_paid, saving: 0 };
  }

  if (tx.payment_method_type === 'card' && EU_COUNTRIES.includes(tx.card_country)) {
    const fee_optimized = Math.round(
      tx.amount * RATES.eu_local.card_percentage + RATES.eu_local.card_fixed
    );
    const saving = Math.max(0, tx.fee_paid - fee_optimized);
    return { ...base, category: 'eu_card', fee_optimized, saving };
  }

  if (
    tx.payment_method_type === 'card' &&
    tx.is_recurring &&
    tx.amount >= 50000 &&
    tx.currency === 'usd'
  ) {
    const fee_optimized = RATES.ach_direct.fixed;
    const saving = Math.max(0, tx.fee_paid - fee_optimized);
    return { ...base, category: 'ach_eligible', fee_optimized, saving };
  }

  const fee_optimized = Math.round(
    tx.amount * RATES.standard_alt.card_percentage + RATES.standard_alt.card_fixed
  );
  const saving = Math.max(0, tx.fee_paid - fee_optimized);
  return { ...base, category: 'standard', fee_optimized, saving };
}

export function aggregateSavings(
  transactions: StripeTransaction[],
  periodDays: number
): SavingsReport {
  const breakdown = transactions.map(calculateTransactionSaving);

  const eu      = breakdown.filter(r => r.category === 'eu_card');
  const ach     = breakdown.filter(r => r.category === 'ach_eligible');
  const standard = breakdown.filter(r => r.category === 'standard');

  const sum = (arr: SavingsResult[], key: keyof SavingsResult) =>
    arr.reduce((s, r) => s + (r[key] as number), 0);

  const period_savings    = sum(breakdown, 'saving');
  const annualized_savings = Math.round(period_savings * (365 / periodDays));
  const our_fee_annual    = Math.round(annualized_savings * 0.20);
  const merchant_net_gain = annualized_savings - our_fee_annual;

  return {
    period_days: periodDays,
    total_transactions: transactions.length,
    total_fees_paid:      sum(breakdown, 'fee_paid'),
    total_fees_optimized: sum(breakdown, 'fee_optimized'),
    period_savings,
    annualized_savings,
    our_fee_annual,
    merchant_net_gain,
    eu: {
      count:          eu.length,
      fees_paid:      sum(eu, 'fee_paid'),
      fees_optimized: sum(eu, 'fee_optimized'),
      savings:        sum(eu, 'saving'),
    },
    ach: {
      count:          ach.length,
      fees_paid:      sum(ach, 'fee_paid'),
      fees_optimized: sum(ach, 'fee_optimized'),
      savings:        sum(ach, 'saving'),
    },
    standard: {
      count:          standard.length,
      fees_paid:      sum(standard, 'fee_paid'),
      fees_optimized: sum(standard, 'fee_optimized'),
      savings:        sum(standard, 'saving'),
    },
    breakdown,
  };
}