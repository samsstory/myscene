import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code_challenge, redirect_uri } = await req.json();
    if (!code_challenge || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing code_challenge or redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || Deno.env.get("VITE_SPOTIFY_CLIENT_ID") || "";
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Spotify client ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopes = "user-top-read";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri,
      code_challenge_method: "S256",
      code_challenge,
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ url, client_id: clientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
