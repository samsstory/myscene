import { useState } from "react";
import { EmailTemplate } from "./EmailTemplateEditor";

interface EmailPreviewPanelProps {
  template: EmailTemplate;
  mode: "approve" | "resend";
}

// Mirrors the buildSceneEmail logic from the edge functions exactly
function buildSceneEmail(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#1a1040 0%,#0d0d12 40%,#0d0d12 100%);min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px 40px;">
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
          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#6366f1,#06b6d4);"></td>
                </tr>
                <tr>
                  <td style="padding:36px 36px 32px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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

function buildApproveBodyHtml(customText: string): string {
  const escaped = customText
    .replace(/\{\{email\}\}/g, "user@example.com")
    .replace(/\{\{password\}\}/g, "Abc123!xyz")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0d0d12;letter-spacing:-0.02em;">You're in 🎶</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">${escaped}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f6f5ff;border:1px solid #e0dfff;border-radius:10px;padding:18px 20px;">
          <p style="margin:0 0 8px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#6366f1;">
            <span style="color:#999;font-weight:500;">Email &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> user@example.com
          </p>
          <p style="margin:0;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#6366f1;">
            <span style="color:#999;font-weight:500;">Password </span> Abc123!xyz
          </p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;">Log in to Scene →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#aaa;text-align:center;line-height:1.6;">We recommend changing your password after your first login.</p>
  `;
}

function buildResendBodyHtml(customText: string): string {
  const escaped = customText
    .replace(/\{\{email\}\}/g, "user@example.com")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s<&]+)/g, (url) => `<a href="${url}" style="color:#6366f1;font-weight:600;">${url}</a>`)
    .replace(/\n/g, "<br>");

  return `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0d0d12;letter-spacing:-0.02em;">Welcome back 🎶</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">${escaped}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="#" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.01em;">Go to Scene →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#aaa;text-align:center;line-height:1.6;">Forgotten your password? Use the reset option on the login page.</p>
  `;
}

export function EmailPreviewPanel({ template, mode }: EmailPreviewPanelProps) {
  const [activeMode, setActiveMode] = useState<"approve" | "resend">(mode);

  const bodyHtml =
    activeMode === "approve"
      ? buildApproveBodyHtml(template.approveBody)
      : buildResendBodyHtml(template.resendBody);

  const subject =
    activeMode === "approve" ? template.approveSubject : template.resendSubject;

  const html = buildSceneEmail(
    activeMode === "approve" ? "You're in 🎶" : "Welcome back 🎶",
    bodyHtml
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
        <button
          onClick={() => setActiveMode("approve")}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeMode === "approve"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Approval Email
        </button>
        <button
          onClick={() => setActiveMode("resend")}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeMode === "resend"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Resend Email
        </button>
      </div>

      {/* Subject line preview */}
      <div className="w-full max-w-[280px] rounded-lg bg-muted/60 px-3 py-2 text-center">
        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Subject</p>
        <p className="text-xs font-medium text-foreground truncate">{subject}</p>
      </div>

      {/* Phone mockup */}
      <div className="relative flex-shrink-0" style={{ width: 260 }}>
        {/* Phone outer shell */}
        <div
          className="relative rounded-[2.5rem] bg-zinc-900 p-2.5"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.08), 0 32px 64px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          {/* Side buttons */}
          <div className="absolute left-[-3px] top-20 w-[3px] h-7 rounded-l-sm bg-zinc-700" />
          <div className="absolute left-[-3px] top-32 w-[3px] h-10 rounded-l-sm bg-zinc-700" />
          <div className="absolute left-[-3px] top-44 w-[3px] h-10 rounded-l-sm bg-zinc-700" />
          <div className="absolute right-[-3px] top-28 w-[3px] h-14 rounded-r-sm bg-zinc-700" />

          {/* Screen bezel */}
          <div className="relative rounded-[2rem] overflow-hidden bg-black" style={{ height: 520 }}>
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-black rounded-full z-20" />

            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-[#0d0d12] z-10 flex items-center justify-between px-5 pt-1">
              <span className="text-white text-[9px] font-semibold">9:41</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5 items-end">
                  {[2, 3, 4].map((h, i) => (
                    <div key={i} className="w-0.5 bg-white rounded-sm" style={{ height: h * 2 }} />
                  ))}
                </div>
                <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
                <div className="flex items-center gap-0.5">
                  <div className="w-4 h-2 rounded-sm border border-white/60 p-px">
                    <div className="w-2.5 h-full bg-white rounded-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Email client chrome */}
            <div className="absolute top-10 left-0 right-0 bg-white/5 border-b border-white/10 z-10 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-500/40 flex items-center justify-center">
                  <span className="text-[7px] text-indigo-200 font-bold">S</span>
                </div>
                <div>
                  <p className="text-[8px] text-white/90 font-semibold leading-none">Scene</p>
                  <p className="text-[7px] text-white/40 leading-none mt-0.5">hello@tryscene.app</p>
                </div>
              </div>
            </div>

            {/* iframe showing email */}
            <iframe
              srcDoc={html}
              title="Email preview"
              className="absolute inset-0 w-full border-0"
              style={{ top: 72, height: "calc(100% - 72px)" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Live preview — updates as you edit the template
      </p>
    </div>
  );
}
