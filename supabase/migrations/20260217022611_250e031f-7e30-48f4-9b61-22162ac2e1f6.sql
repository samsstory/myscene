
-- Create bug_reports table
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  device_info JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can insert their own bug reports"
ON public.bug_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins can view all reports
CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update reports (e.g. mark resolved)
CREATE POLICY "Admins can update bug reports"
ON public.bug_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
