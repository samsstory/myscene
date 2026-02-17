import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Quote, Pencil, Check, X } from "lucide-react";

interface LoadingQuote {
  id: string;
  text: string;
  author: string;
  is_active: boolean;
  created_at: string;
}

export function QuotesTab() {
  const [quotes, setQuotes] = useState<LoadingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [quoteDelay, setQuoteDelay] = useState(800);
  const [minDisplay, setMinDisplay] = useState(1500);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from("loading_quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load quotes");
      return;
    }
    setQuotes(data || []);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["quote_delay_ms", "quote_min_display_ms"]);

    if (data) {
      for (const row of data) {
        if (row.key === "quote_delay_ms") setQuoteDelay(Number(row.value));
        if (row.key === "quote_min_display_ms") setMinDisplay(Number(row.value));
      }
    }
  };

  useEffect(() => { fetchQuotes(); fetchSettings(); }, []);

  const handleAdd = async () => {
    if (!newText.trim() || !newAuthor.trim()) {
      toast.error("Both quote and author are required");
      return;
    }

    const { error } = await supabase
      .from("loading_quotes")
      .insert({ text: newText.trim(), author: newAuthor.trim() });

    if (error) {
      toast.error("Failed to add quote");
      return;
    }

    setNewText("");
    setNewAuthor("");
    toast.success("Quote added");
    fetchQuotes();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("loading_quotes")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update quote");
      return;
    }

    setQuotes(prev => prev.map(q => q.id === id ? { ...q, is_active: isActive } : q));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("loading_quotes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete quote");
      return;
    }

    toast.success("Quote deleted");
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  const startEdit = (quote: LoadingQuote) => {
    setEditingId(quote.id);
    setEditText(quote.text);
    setEditAuthor(quote.author);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim() || !editAuthor.trim()) return;

    const { error } = await supabase
      .from("loading_quotes")
      .update({ text: editText.trim(), author: editAuthor.trim() })
      .eq("id", editingId);

    if (error) {
      toast.error("Failed to update quote");
      return;
    }

    toast.success("Quote updated");
    setEditingId(null);
    fetchQuotes();
  };

  const activeCount = quotes.filter(q => q.is_active).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Quote className="h-5 w-5" />
          Loading Screen Quotes
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {activeCount} active · {quotes.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timing settings */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Display Timing</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Delay before showing quote (ms)</label>
              <Input
                type="number"
                min={0}
                max={5000}
                step={100}
                value={quoteDelay}
                onChange={e => setQuoteDelay(Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground/70">If load finishes before this, no quote appears</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Min display time once visible (ms)</label>
              <Input
                type="number"
                min={0}
                max={10000}
                step={100}
                value={minDisplay}
                onChange={e => setMinDisplay(Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground/70">Holds the loader so the quote is readable</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={savingSettings}
            onClick={async () => {
              setSavingSettings(true);
              const updates = [
                supabase.from("app_settings").update({ value: quoteDelay, updated_at: new Date().toISOString() }).eq("key", "quote_delay_ms"),
                supabase.from("app_settings").update({ value: minDisplay, updated_at: new Date().toISOString() }).eq("key", "quote_min_display_ms"),
              ];
              const results = await Promise.all(updates);
              const hasError = results.some(r => r.error);
              if (hasError) toast.error("Failed to save settings");
              else toast.success("Timing settings saved");
              setSavingSettings(false);
            }}
          >
            {savingSettings ? "Saving…" : "Save timing settings"}
          </Button>
        </div>

        {/* Add new quote */}
        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium text-muted-foreground">Add new quote</p>
          <Textarea
            placeholder='"Your quote here..."'
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Author name"
              value={newAuthor}
              onChange={e => setNewAuthor(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAdd} size="sm" disabled={!newText.trim() || !newAuthor.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Quotes list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading quotes…</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No quotes yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {quotes.map(quote => (
              <div
                key={quote.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-opacity ${
                  !quote.is_active ? "opacity-50" : ""
                }`}
              >
                <Switch
                  checked={quote.is_active}
                  onCheckedChange={checked => handleToggle(quote.id, checked)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  {editingId === quote.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="resize-none text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Input
                          value={editAuthor}
                          onChange={e => setEditAuthor(e.target.value)}
                          className="flex-1 text-sm"
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm italic leading-relaxed">"{quote.text}"</p>
                      <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
                    </>
                  )}
                </div>
                {editingId !== quote.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(quote)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(quote.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
