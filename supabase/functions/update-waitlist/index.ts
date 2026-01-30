import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlistId, discoverySource, showsPerYear } = await req.json();

    // Validate required fields
    if (!waitlistId) {
      return new Response(
        JSON.stringify({ error: 'Missing waitlist ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(waitlistId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid waitlist ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize input values
    const validDiscoverySources = ['invited', 'social', 'friend', 'other', null];
    const validShowsPerYear = ['1-3', '4-10', '11-20', '20+', null];

    const sanitizedDiscoverySource = validDiscoverySources.includes(discoverySource) 
      ? discoverySource 
      : null;
    const sanitizedShowsPerYear = validShowsPerYear.includes(showsPerYear) 
      ? showsPerYear 
      : null;

    // Use service role to bypass RLS and update the waitlist entry
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseAdmin
      .from('waitlist')
      .update({
        discovery_source: sanitizedDiscoverySource,
        shows_per_year: sanitizedShowsPerYear,
      })
      .eq('id', waitlistId);

    if (error) {
      console.error('Error updating waitlist:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update waitlist entry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
