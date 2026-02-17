import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys,
} from "npm:@block65/webcrypto-web-push@0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, url } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ALL push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No push subscriptions found", sent_users: 0, total_users: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapid: VapidKeys = {
      subject: Deno.env.get("VAPID_SUBJECT")!,
      publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ||
        "BLV3owjsD6CDGWNo-l2QMp2J0sZo8ciOXWGpT0GRcvoNd9OSIIdoegH8DucLc5B7AkQZI8RKb3uN5HnDO_696xI",
      privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
    };

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: url || "/",
    });

    const userIds = new Set(subscriptions.map((s) => s.user_id));

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription: PushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        const message: PushMessage = {
          data: notificationPayload,
          options: { ttl: 60 * 60 },
        };

        const payload = await buildPushPayload(message, subscription, vapid);

        const response = await fetch(payload.endpoint, {
          method: payload.method,
          headers: payload.headers,
          body: payload.body,
        });

        if (!response.ok) {
          const text = await response.text();
          if (response.status === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw new Error(`Push failed (${response.status}): ${text}`);
        }

        await response.text();
        return { endpoint: sub.endpoint, user_id: sub.user_id, status: "sent" };
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const sentUserIds = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value.user_id)
    );

    // Log the broadcast
    await supabaseAdmin.from("push_notification_logs").insert({
      sender_id: callerId,
      target_type: "broadcast",
      target_user_id: null,
      title,
      body,
      url: url || "/",
      sent_count: sent,
      failed_count: failed,
      total_devices: subscriptions.length,
    });

    return new Response(
      JSON.stringify({
        sent,
        failed,
        total: subscriptions.length,
        sent_users: sentUserIds.size,
        total_users: userIds.size,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Broadcast push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
