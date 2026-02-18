import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  X,
} from "lucide-react";
import { PushNotificationsPanel } from "./PushNotificationsPanel";
import { SimpleEmailPreview } from "./EmailPreviewPanel";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_APPROVE_SUBJECT,
  DEFAULT_APPROVE_BODY,
  DEFAULT_RESEND_SUBJECT,
  DEFAULT_RESEND_BODY,
  type EmailTemplate,
} from "./EmailTemplateEditor";

/* ------------------------------------------------------------------ */
/*  Types & storage helpers                                           */
/* ------------------------------------------------------------------ */

interface StoredTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: "approve" | "resend" | "custom";
}

const TEMPLATES_KEY = "scene-email-templates";
const LEGACY_KEY = "scene-email-template";

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

/** Seed defaults (used on first load or reset) */
function defaultTemplates(): StoredTemplate[] {
  return [
    {
      id: "approve-default",
      name: "Approval Email",
      subject: DEFAULT_APPROVE_SUBJECT,
      body: DEFAULT_APPROVE_BODY,
      type: "approve",
    },
    {
      id: "resend-default",
      name: "Resend Email",
      subject: DEFAULT_RESEND_SUBJECT,
      body: DEFAULT_RESEND_BODY,
      type: "resend",
    },
  ];
}

function loadTemplates(): StoredTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (raw) return JSON.parse(raw) as StoredTemplate[];
  } catch {}

  // migrate legacy format
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as EmailTemplate;
      const migrated: StoredTemplate[] = [
        {
          id: "approve-default",
          name: "Approval Email",
          subject: old.approveSubject,
          body: old.approveBody,
          type: "approve",
        },
        {
          id: "resend-default",
          name: "Resend Email",
          subject: old.resendSubject,
          body: old.resendBody,
          type: "resend",
        },
      ];
      persistTemplates(migrated);
      return migrated;
    }
  } catch {}

  const defaults = defaultTemplates();
  persistTemplates(defaults);
  return defaults;
}

function persistTemplates(templates: StoredTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  // keep legacy key in sync for backward compat with edge functions
  const approve = templates.find((t) => t.type === "approve");
  const resend = templates.find((t) => t.type === "resend");
  const legacy: EmailTemplate = {
    approveSubject: approve?.subject ?? DEFAULT_APPROVE_SUBJECT,
    approveBody: approve?.body ?? DEFAULT_APPROVE_BODY,
    resendSubject: resend?.subject ?? DEFAULT_RESEND_SUBJECT,
    resendBody: resend?.body ?? DEFAULT_RESEND_BODY,
  };
  localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
}

/* ------------------------------------------------------------------ */
/*  Channel type                                                      */
/* ------------------------------------------------------------------ */

type Channel = "email" | "sms" | "app";

const CHANNELS: { value: Channel; label: string; icon: React.ReactNode; soon?: boolean }[] = [
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "app", label: "Push", icon: <Bell className="h-4 w-4" /> },
  { value: "sms", label: "SMS", icon: <MessageSquare className="h-4 w-4" />, soon: true },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function ComingSoonPlaceholder({ channel }: { channel: "sms" | "app" }) {
  const Icon = channel === "sms" ? MessageSquare : Bell;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-40" />
      <p className="text-lg font-medium">Coming Soon</p>
      <p className="max-w-xs text-center text-sm">
        {channel === "sms"
          ? "SMS announcements will let you reach users instantly via text message."
          : "In-app announcements will appear directly inside the Scene app."}
      </p>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: StoredTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
            {template.type !== "custom" && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {template.type}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{template.subject}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {template.type === "custom" && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}




function TemplateEditorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: StoredTemplate | null;
  onSave: (t: StoredTemplate) => void;
  onCancel: () => void;
}) {
  const isNew = !initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  const handleSave = () => {
    if (!name.trim() || !subject.trim()) {
      toast({ title: "Name and subject are required", variant: "destructive" });
      return;
    }
    onSave({
      id: initial?.id ?? generateId(),
      name: name.trim(),
      subject: subject.trim(),
      body,
      type: initial?.type ?? "custom",
    });
  };

  const handleReset = () => {
    if (!initial) return;
    if (initial.type === "approve") {
      setSubject(DEFAULT_APPROVE_SUBJECT);
      setBody(DEFAULT_APPROVE_BODY);
    } else if (initial.type === "resend") {
      setSubject(DEFAULT_RESEND_SUBJECT);
      setBody(DEFAULT_RESEND_BODY);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{isNew ? "New Template" : `Edit — ${initial.name}`}</CardTitle>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Editor column */}
          <div className="flex-1 space-y-4 p-4 min-w-0">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Body</Label>
              <Textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs"
                placeholder="Write your template body here..."
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">{"{{email}}"}</code> and{" "}
                <code className="rounded bg-muted px-1">{"{{password}}"}</code> as placeholders.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSave}>
                {isNew ? "Create Template" : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              {initial && initial.type !== "custom" && (
                <Button size="sm" variant="ghost" onClick={handleReset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset Defaults
                </Button>
              )}
            </div>
          </div>

          {/* Live phone mockup preview — always visible */}
          <div className="lg:w-[320px] border-t lg:border-t-0 lg:border-l border-border bg-muted/30 px-4 py-6 flex flex-col items-center gap-2 shrink-0">
            
            <SimpleEmailPreview
              subject={subject}
              body={body}
              type={initial?.type === "resend" ? "resend" : "approve"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


/* ------------------------------------------------------------------ */
/*  Main panel                                                        */
/* ------------------------------------------------------------------ */

export function AnnouncementsPanel() {
  const [channel, setChannel] = useState<Channel>("email");
  const [templates, setTemplates] = useState<StoredTemplate[]>(loadTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const save = useCallback(
    (updated: StoredTemplate) => {
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === updated.id);
        const next = idx >= 0 ? prev.map((t) => (t.id === updated.id ? updated : t)) : [...prev, updated];
        persistTemplates(next);
        return next;
      });
      setEditingId(null);
      setCreating(false);
      toast({ title: "Template saved" });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistTemplates(next);
      return next;
    });
    toast({ title: "Template deleted" });
  }, []);

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Announcements</h2>
        <p className="text-sm text-muted-foreground">Manage announcements for the community.</p>
      </div>

      {/* Channel toggle */}
      <div className="flex items-center gap-2">
        {CHANNELS.map((ch) => (
          <Button
            key={ch.value}
            size="sm"
            variant="ghost"
            disabled={ch.soon}
            className={cn(
              "gap-1.5 border transition-all",
              channel === ch.value
                ? "bg-primary/[0.10] border-primary/[0.25] text-primary/80"
                : "bg-transparent border-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              ch.soon ? "opacity-50" : "",
            )}
            onClick={() => !ch.soon && setChannel(ch.value)}
          >
            {ch.icon}
            <span>{ch.label}</span>
            {ch.soon && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[9px] bg-white/[0.06] text-muted-foreground border-white/[0.08]">
                Soon
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Channel content */}
      {channel === "email" ? (
        <div className="space-y-4">
          {/* Template list */}
          <div className="space-y-2">
            {templates.map((t) =>
              editingId === t.id ? (
                <TemplateEditorForm
                  key={t.id}
                  initial={t}
                  onSave={save}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => {
                    setCreating(false);
                    setEditingId(t.id);
                  }}
                  onDelete={() => remove(t.id)}
                />
              ),
            )}
          </div>

          {/* Create new */}
          {creating ? (
            <TemplateEditorForm initial={null} onSave={save} onCancel={() => setCreating(false)} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setCreating(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create New Template
            </Button>
          )}
        </div>
      ) : channel === "app" ? (
        <PushNotificationsPanel />
      ) : (
        <ComingSoonPlaceholder channel={channel} />
      )}
    </div>
  );
}
