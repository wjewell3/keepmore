import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, company_name } = await req.json();

    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    // Upsert so repeat submissions from same email reuse the same merchant row
    const { data, error } = await supabase
      .from('merchants')
      .upsert({ email, company_name }, { onConflict: 'email' })
      .select('id')
      .single();

    if (error) throw error;

    return Response.json({ merchant_id: data.id });
  } catch (err: any) {
    console.error('[merchants]', err);
    return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}