import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

function wrapInHtmlEmail(plainText: string): string {
  const escaped = plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      const clean = url.replace(/&amp;/g, "&");
      return `<a href="${clean}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0;">${clean}</a>`;
    })
    .replace(/\n/g, "<br>");
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.6;">
      ${escaped}
    </div>
  `;
}

function buildWelcomeHtml(email: string, password: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Scene 🎶</h1>
      <p style="color: #555; line-height: 1.6;">You've been approved for beta access! Here are your login details:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://tryscene.app" style="display: inline-block; background: #6366f1; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Log in to Scene →</a>
      </div>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">We recommend changing your password after your first login.</p>
    </div>
  `;
}

async function sendWelcomeEmail(email: string, password: string, customSubject?: string, customBody?: string): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  const subject = customSubject || "You're in! Your Scene beta access is ready";
  let html: string;

  if (customBody) {
    const replaced = customBody
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{password\}\}/g, password);
    html = wrapInHtmlEmail(replaced);
  } else {
    html = buildWelcomeHtml(email, password);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Scene <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { waitlistId, email, emailSubject, emailBody } = await req.json();

    if (!waitlistId || !email) {
      return new Response(
        JSON.stringify({ error: "waitlistId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const DEFAULT_SUBJECT = "You're in! Your Scene beta access is ready";

    // Auto-generate a secure password
    const password = generatePassword();

    // Create user account
    const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser) {
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.id, role: "user" });
    if (roleError) console.error("Failed to assign role:", roleError);

    // Update waitlist status
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "approved" })
      .eq("id", waitlistId);
    if (updateError) console.error("Failed to update waitlist:", updateError);

    // Send welcome email with auto-generated credentials
    const notified = await sendWelcomeEmail(email, password, emailSubject, emailBody);

    if (notified) {
      await supabase
        .from("waitlist")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", waitlistId);
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.id, notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
