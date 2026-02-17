import { useState } from "react";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedShow {
  id: string;
  artist: string;
  venue: string;
  date: string;
  confidence: "high" | "medium" | "low";
  spotify: {
    id: string;
    imageUrl: string | null;
    genres: string[];
  } | null;
}

interface TextImportStepProps {
  onShowsParsed: (shows: ParsedShow[]) => void;
  onBack: () => void;
}

const TextImportStep = ({ onShowsParsed, onBack }: TextImportStepProps) => {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFindShows = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Paste some text first!");
      return;
    }

    setError(null);
    setIsParsing(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-show-notes', {
        body: { text: trimmed },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to parse shows');
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      const shows: ParsedShow[] = (data?.shows || []).map((s: any, i: number) => ({
        id: `parsed-${i}-${Date.now()}`,
        artist: s.artist,
        venue: s.venue || '',
        date: s.date || '',
        confidence: s.confidence || 'medium',
        spotify: s.spotify || null,
      }));

      if (shows.length === 0) {
        setError("Couldn't find any shows in your text. Try a different format.");
        return;
      }

      toast.success(`Found ${shows.length} show${shows.length !== 1 ? 's' : ''}!`);
      onShowsParsed(shows);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header icon */}
      <div className="text-center space-y-2 pt-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Import from Notes</h2>
        <p className="text-sm text-muted-foreground">
          Paste your list — any format works
        </p>
      </div>

      {/* Textarea */}
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        placeholder={`bicep printworks dec 2023\nfred again, ally pally, jan 12 2024\ndisclosure @ hï ibiza summer 2023\njamie xx b2b four tet, fabric, march 2024`}
        className="min-h-[180px] resize-none bg-white/[0.03] border-white/[0.1] placeholder:text-muted-foreground/50 text-sm leading-relaxed"
        autoFocus
        disabled={isParsing}
      />

      {/* Character count */}
      <p className="text-xs text-muted-foreground text-right -mt-3">
        {text.length > 0 && `${text.length} characters`}
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Find Shows CTA */}
      <Button
        onClick={handleFindShows}
        disabled={isParsing || text.trim().length === 0}
        className="w-full py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(189,94%,55%)] via-primary to-[hsl(17,88%,60%)] shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
        size="lg"
      >
        {isParsing ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Finding shows...
          </>
        ) : (
          "Find Shows"
        )}
      </Button>
    </div>
  );
};

export default TextImportStep;
