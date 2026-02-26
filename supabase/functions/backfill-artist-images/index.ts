import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch artists with NULL image_url, limit to 50 per run
    const { data: artists, error } = await supabase
      .from('artists')
      .select('name')
      .is('image_url', null)
      .limit(50);

    if (error) {
      console.error('[backfill-artist-images] DB query error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!artists || artists.length === 0) {
      console.log('[backfill-artist-images] No artists with NULL image_url — nothing to do');
      return new Response(JSON.stringify({ message: 'No artists to backfill', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const names = artists.map((a) => a.name);
    console.log(`[backfill-artist-images] Found ${names.length} artists to enrich`);

    // Call batch-artist-images edge function
    const batchUrl = `${supabaseUrl}/functions/v1/batch-artist-images`;
    const resp = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ names }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[backfill-artist-images] batch-artist-images returned ${resp.status}: ${text}`);
      return new Response(JSON.stringify({ error: `batch call failed: ${resp.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await resp.json();
    const enrichedCount = Object.values(result.artists || {}).filter(
      (a: unknown) => (a as { image_url: string }).image_url
    ).length;

    console.log(`[backfill-artist-images] Enriched ${enrichedCount}/${names.length} artists`);

    return new Response(
      JSON.stringify({
        message: 'Backfill complete',
        requested: names.length,
        enriched: enrichedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[backfill-artist-images] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
