-- Enable pgcrypto for encryption helpers
create extension if not exists pgcrypto;

-- ── Merchants ──────────────────────────────────────────────────────────────
create table merchants (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  company_name        text,
  stripe_restricted_key text,          -- store encrypted; see app/api/ingest
  stripe_account_id   text,
  hyperswitch_merchant_id text,        -- Hyperswitch Cloud merchant id (Phase 2)
  created_at          timestamptz default now(),
  onboarded_at        timestamptz
);

-- ── Raw Stripe charges ─────────────────────────────────────────────────────
create table stripe_transactions (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid references merchants(id) on delete cascade,
  stripe_charge_id    text not null,
  amount              integer,          -- cents
  fee_paid            integer,          -- cents
  currency            text,
  card_country        text,
  card_funding        text,             -- credit | debit | prepaid
  card_network        text,
  payment_method_type text,             -- card | us_bank_account | sepa_debit
  is_recurring        boolean default false,
  customer_id         text,
  created_at          timestamptz,
  inserted_at         timestamptz default now(),
  unique (merchant_id, stripe_charge_id)
);

create index idx_stripe_tx_merchant on stripe_transactions(merchant_id);
create index idx_stripe_tx_created  on stripe_transactions(created_at);

-- ── Savings reports ────────────────────────────────────────────────────────
create table savings_reports (
  id                        uuid primary key default gen_random_uuid(),
  merchant_id               uuid references merchants(id) on delete cascade,
  report_date               date default current_date,
  period_start              date,
  period_end                date,
  period_days               integer,
  total_transactions        integer,
  total_fees_paid           integer,    -- cents
  total_fees_optimized      integer,    -- cents
  eu_count                  integer,
  eu_fees_paid              integer,
  eu_fees_optimized         integer,
  eu_savings                integer,
  ach_count                 integer,
  ach_fees_paid             integer,
  ach_fees_optimized        integer,
  ach_savings               integer,
  standard_count            integer,
  standard_savings          integer,
  period_savings            integer,
  annualized_savings        integer,
  our_fee_annual            integer,
  merchant_net_gain         integer,
  report_json               jsonb,      -- full breakdown for rendering
  created_at                timestamptz default now()
);

create index idx_reports_merchant on savings_reports(merchant_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table merchants           enable row level security;
alter table stripe_transactions enable row level security;
alter table savings_reports     enable row level security;

-- Service role bypasses RLS (used in API routes with SUPABASE_SERVICE_KEY)
-- Anon/authenticated policies added when auth is wired up