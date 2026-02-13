import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Mail, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "scene-email-template";

export const DEFAULT_APPROVE_SUBJECT = "You're in! Your Scene beta access is ready";
export const DEFAULT_APPROVE_BODY = `Welcome to Scene!

Your beta access is ready. Here are your login details:

Email: {{email}}
Temporary Password: {{password}}

👉 Log in now: https://myscene.lovable.app

We recommend changing your password after your first login.`;

export const DEFAULT_RESEND_SUBJECT = "You're in! Your Scene beta access is ready";
export const DEFAULT_RESEND_BODY = `Welcome to Scene!

Your beta access is ready! Log in with the credentials you were given.

👉 Go to Scene: https://myscene.lovable.app

If you've forgotten your password, use the reset option on the login page.`;

export interface EmailTemplate {
  approveSubject: string;
  approveBody: string;
  resendSubject: string;
  resendBody: string;
}

export function getStoredTemplate(): EmailTemplate {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    approveSubject: DEFAULT_APPROVE_SUBJECT,
    approveBody: DEFAULT_APPROVE_BODY,
    resendSubject: DEFAULT_RESEND_SUBJECT,
    resendBody: DEFAULT_RESEND_BODY,
  };
}

function saveTemplate(template: EmailTemplate) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
}

export function EmailTemplateEditor() {
  const [expanded, setExpanded] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate>(getStoredTemplate);

  const handleSave = () => {
    saveTemplate(template);
    toast({ title: "Template saved", description: "Will apply to all future approvals & resends." });
  };

  const handleReset = () => {
    const defaults: EmailTemplate = {
      approveSubject: DEFAULT_APPROVE_SUBJECT,
      approveBody: DEFAULT_APPROVE_BODY,
      resendSubject: DEFAULT_RESEND_SUBJECT,
      resendBody: DEFAULT_RESEND_BODY,
    };
    setTemplate(defaults);
    saveTemplate(defaults);
    toast({ title: "Template reset to defaults" });
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Email Templates</span>
          <span className="text-xs text-muted-foreground">— auto-applied on approve & resend</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-border px-4 py-4">
          {/* Approval template */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Approval Email</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                value={template.approveSubject}
                onChange={(e) => setTemplate({ ...template, approveSubject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Textarea
                rows={7}
                value={template.approveBody}
                onChange={(e) => setTemplate({ ...template, approveBody: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">{"{{email}}"}</code> and <code className="rounded bg-muted px-1">{"{{password}}"}</code> as placeholders.
              </p>
            </div>
          </div>

          {/* Resend template */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Resend Email</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                value={template.resendSubject}
                onChange={(e) => setTemplate({ ...template, resendSubject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Textarea
                rows={5}
                value={template.resendBody}
                onChange={(e) => setTemplate({ ...template, resendBody: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">{"{{email}}"}</code> as a placeholder. No password placeholder for resends.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>Save Template</Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Defaults
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
