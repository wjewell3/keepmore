import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
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

    if (error) {
      console.error('[merchants] Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return Response.json({ merchant_id: data.id });
  } catch (err: any) {
    console.error('[merchants] Error:', err);
    
    // Log additional context for debugging
    if (err.code) {
      console.error('[merchants] Error code:', err.code);
    }
    if (err.details) {
      console.error('[merchants] Error details:', err.details);
    }
    
    return Response.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}