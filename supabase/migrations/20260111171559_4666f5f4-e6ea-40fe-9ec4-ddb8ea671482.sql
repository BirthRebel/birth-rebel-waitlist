-- Add decline_reason and caregiver_synopsis to matches table
ALTER TABLE public.matches 
ADD COLUMN decline_reason TEXT,
ADD COLUMN caregiver_synopsis TEXT,
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create admin_notifications table for dashboard notifications
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  match_id UUID REFERENCES public.matches(id),
  parent_email TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage notifications
CREATE POLICY "Admins can view all notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notifications" 
ON public.admin_notifications 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));