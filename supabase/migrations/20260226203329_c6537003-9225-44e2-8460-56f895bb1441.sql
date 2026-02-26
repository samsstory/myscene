
-- Table to store parsed shows from forwarded ticket emails
CREATE TABLE public.pending_email_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_subject TEXT,
  email_from TEXT,
  raw_content TEXT,
  parsed_shows JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence TEXT DEFAULT 'medium',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pending_email_imports ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending imports
CREATE POLICY "Users can view their own pending imports"
  ON public.pending_email_imports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own pending imports (to confirm/dismiss)
CREATE POLICY "Users can update their own pending imports"
  ON public.pending_email_imports FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own pending imports
CREATE POLICY "Users can delete their own pending imports"
  ON public.pending_email_imports FOR DELETE
  USING (auth.uid() = user_id);

-- Service role inserts (from edge function) - allow insert with no user auth check
-- since the edge function uses service role key
CREATE POLICY "Service role can insert pending imports"
  ON public.pending_email_imports FOR INSERT
  WITH CHECK (true);

-- Index for quick lookup by user
CREATE INDEX idx_pending_email_imports_user_status 
  ON public.pending_email_imports (user_id, status);
