import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { aggregateSavings, StripeTransaction } from '@keepmore/core';

const PERIOD_DAYS = 90;

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const { merchant_id, stripe_key } = await req.json();

    if (!merchant_id || !stripe_key) {
      return Response.json({ error: 'merchant_id and stripe_key are required' }, { status: 400 });
    }

    const stripe = new Stripe(stripe_key, { apiVersion: '2024-06-20' });

    // Validate the key works before storing anything
    try {
      await stripe.charges.list({ limit: 1 });
    } catch {
      return Response.json({ error: 'Invalid or insufficient Stripe API key' }, { status: 400 });
    }

    const since = Math.floor(Date.now() / 1000) - PERIOD_DAYS * 24 * 60 * 60;
    const periodStart = new Date(since * 1000).toISOString().split('T')[0];
    const periodEnd   = new Date().toISOString().split('T')[0];

    // Paginate all charges in the window
    const charges: Stripe.Charge[] = [];
    let startingAfter: string | undefined;

    while (true) {
      const batch = await stripe.charges.list({
        limit: 100,
        created: { gte: since },
        expand: ['data.balance_transaction'],
        ...(startingAfter && { starting_after: startingAfter }),
      });
      charges.push(...batch.data);
      if (!batch.has_more) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    const succeeded = charges.filter(c => c.status === 'succeeded');

    const rows = succeeded.map(c => {
      const bt = c.balance_transaction as Stripe.BalanceTransaction | null;
      const pm = c.payment_method_details;
      return {
        merchant_id,
        stripe_charge_id:    c.id,
        amount:              c.amount,
        fee_paid:            bt?.fee ?? 0,
        currency:            c.currency,
        card_country:        pm?.card?.country ?? '',
        card_funding:        pm?.card?.funding ?? '',
        card_network:        pm?.card?.network ?? '',
        payment_method_type: pm?.type ?? 'card',
        is_recurring:        !!c.invoice,
        customer_id:         typeof c.customer === 'string' ? c.customer : '',
        created_at:          new Date(c.created * 1000).toISOString(),
      };
    });

    // Upsert to avoid duplicates on re-runs
    if (rows.length > 0) {
      const { error: txError } = await supabase
        .from('stripe_transactions')
        .upsert(rows, { onConflict: 'merchant_id,stripe_charge_id' });

      if (txError) throw txError;
    }

    // Compute and persist savings report
    const txForCalc: StripeTransaction[] = rows.map(r => ({
      stripe_charge_id:    r.stripe_charge_id,
      amount:              r.amount,
      fee_paid:            r.fee_paid,
      currency:            r.currency,
      card_country:        r.card_country,
      card_funding:        r.card_funding,
      card_network:        r.card_network,
      payment_method_type: r.payment_method_type,
      is_recurring:        r.is_recurring,
      customer_id:         r.customer_id,
    }));

    const report = aggregateSavings(txForCalc, PERIOD_DAYS);

    const { data: savedReport, error: reportError } = await supabase
      .from('savings_reports')
      .insert({
        merchant_id,
        period_start:       periodStart,
        period_end:         periodEnd,
        period_days:        PERIOD_DAYS,
        total_transactions: report.total_transactions,
        total_fees_paid:    report.total_fees_paid,
        total_fees_optimized: report.total_fees_optimized,
        eu_count:           report.eu.count,
        eu_fees_paid:       report.eu.fees_paid,
        eu_fees_optimized:  report.eu.fees_optimized,
        eu_savings:         report.eu.savings,
        ach_count:          report.ach.count,
        ach_fees_paid:      report.ach.fees_paid,
        ach_fees_optimized: report.ach.fees_optimized,
        ach_savings:        report.ach.savings,
        standard_count:     report.standard.count,
        standard_savings:   report.standard.savings,
        period_savings:     report.period_savings,
        annualized_savings: report.annualized_savings,
        our_fee_annual:     report.our_fee_annual,
        merchant_net_gain:  report.merchant_net_gain,
        report_json:        report,
      })
      .select('id')
      .single();

    if (reportError) throw reportError;

    // Mark merchant as onboarded
    await supabase
      .from('merchants')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', merchant_id);

    // TODO: Phase 2 — send report email from private layer
    // sendReportEmail({ to, companyName, reportId, ... })

    return Response.json({
      success: true,
      ingested: rows.length,
      report_id: savedReport.id,
    });

  } catch (err: any) {
    console.error('[ingest]', err);
    return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}