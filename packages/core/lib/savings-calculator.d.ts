export interface StripeTransaction {
    stripe_charge_id: string;
    amount: number;
    fee_paid: number;
    currency: string;
    card_country: string;
    card_funding: string;
    card_network: string;
    payment_method_type: string;
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
export declare function calculateTransactionSaving(tx: StripeTransaction): SavingsResult;
export declare function aggregateSavings(transactions: StripeTransaction[], periodDays: number): SavingsReport;
//# sourceMappingURL=savings-calculator.d.ts.map