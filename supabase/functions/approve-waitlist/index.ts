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

function buildSceneEmail(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#1a1040 0%,#0d0d12 40%,#0d0d12 100%);min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px 40px;">

        <!-- Wordmark -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:800;letter-spacing:0.25em;color:#ffffff;text-transform:uppercase;">SCENE ✦</span>
            </td>
          </tr>
          <tr>
            <td>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 32px;">
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <!-- Card top accent bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#6366f1,#06b6d4);"></td>
                </tr>
                <!-- Card body -->
                <tr>
                  <td style="padding:36px 36px 32px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;color:rgba(255,255,255,0.35);font-size:13px;letter-spacing:0.08em;font-weight:600;text-transform:uppercase;">tryscene.app</p>
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.5;">You're receiving this because you joined the Scene waitlist.<br>Questions? Reply to this email.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildApproveBodyHtml(email: string, password: string, customText?: string): string {
  const mainText = customText
    ? customText
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
    : "You've been approved for <strong>Scene beta access</strong>! Here are your login credentials:";

  return `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0d0d12;letter-spacing:-0.02em;">You're in 🎶</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">${mainText}</p>

    <!-- Credentials block -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f6f5ff;border:1px solid #e0dfff;border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 8px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#6366f1;">
            <span style="color:#999;font-weight:500;">Email &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> ${email}
          </p>
          <p style="margin:0;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#6366f1;">
            <span style="color:#999;font-weight:500;">Password </span> ${password}
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="https://tryscene.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;">Log in to Scene →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#aaa;text-align:center;line-height:1.6;">We recommend changing your password after your first login.</p>
  `;
}

function buildResendBodyHtml(email: string, customText?: string): string {
  const mainText = customText
    ? customText
        .replace(/\{\{email\}\}/g, email)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/(https?:\/\/[^\s<&]+)/g, (url) => `<a href="${url}" style="color:#6366f1;font-weight:600;">${url}</a>`)
        .replace(/\n/g, "<br>")
    : "Your <strong>Scene beta access</strong> is ready. Log in with the credentials you were given when you were first approved.";

  return `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0d0d12;letter-spacing:-0.02em;">Welcome back 🎶</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">${mainText}</p>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="https://tryscene.app" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;">Go to Scene →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#aaa;text-align:center;line-height:1.6;">Forgotten your password? Use the reset option on the login page.</p>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Scene <hello@tryscene.app>",
        to: [to],
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

    const password = generatePassword();

    let newUser;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          return new Response(
            JSON.stringify({ error: "Failed to look up existing user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        newUser = listData.users.find((u) => u.email === email);
        if (!newUser) {
          return new Response(
            JSON.stringify({ error: "User exists but could not be found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      newUser = createData.user;
    }

    if (!newUser) {
      return new Response(
        JSON.stringify({ error: "Failed to create or find user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: newUser.id, role: "user" });
    if (roleError) console.error("Failed to assign role:", roleError);

    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "approved" })
      .eq("id", waitlistId);
    if (updateError) console.error("Failed to update waitlist:", updateError);

    const subject = emailSubject || "You're in! Your Scene beta access is ready";
    const customText = emailBody
      ? emailBody.replace(/\{\{email\}\}/g, email).replace(/\{\{password\}\}/g, password)
      : undefined;

    const bodyHtml = buildApproveBodyHtml(email, password, customText);
    const html = buildSceneEmail("You're in 🎶", bodyHtml);

    const notified = await sendEmail(email, subject, html);

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
