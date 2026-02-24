import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const inviteId = url.searchParams.get("id");
    if (!inviteId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invite
    const { data: invite, error: inviteErr } = await supabase
      .from("festival_invites")
      .select("id, festival_name, selected_artists, festival_lineup_id, created_by")
      .eq("id", inviteId)
      .single();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lineup
    const { data: lineup } = await supabase
      .from("festival_lineups")
      .select("id, artists, venue_name, venue_location, date_start, year, event_name")
      .eq("id", invite.festival_lineup_id)
      .single();

    // Fetch inviter profile
    const { data: inviter } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", invite.created_by)
      .single();

    return new Response(
      JSON.stringify({
        invite: {
          id: invite.id,
          festival_name: invite.festival_name,
          selected_artists: invite.selected_artists,
        },
        lineup: lineup || null,
        inviter: inviter || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
