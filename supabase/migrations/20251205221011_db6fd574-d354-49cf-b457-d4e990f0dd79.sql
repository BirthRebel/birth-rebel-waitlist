-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Parent requests table (from Formless intake)
CREATE TABLE public.parent_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text,
    email text NOT NULL,
    phone text,
    support_type text,
    due_date date,
    location text,
    special_requirements text,
    status text NOT NULL DEFAULT 'new',
    matched_caregiver_id uuid REFERENCES public.caregivers(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_requests ENABLE ROW LEVEL SECURITY;

-- Conversations table
CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_request_id uuid REFERENCES public.parent_requests(id) ON DELETE CASCADE,
    caregiver_id uuid REFERENCES public.caregivers(id),
    parent_email text NOT NULL,
    subject text,
    status text NOT NULL DEFAULT 'open',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('admin', 'caregiver', 'parent')),
    sender_id uuid,
    content text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for parent_requests (admin only)
CREATE POLICY "Admins can view all parent requests"
ON public.parent_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert parent requests"
ON public.parent_requests FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update parent requests"
ON public.parent_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view their conversations"
ON public.conversations FOR SELECT
USING (caregiver_id = get_current_caregiver_id());

CREATE POLICY "Admins can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update conversations"
ON public.conversations FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for messages
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can view messages in their conversations"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND c.caregiver_id = get_current_caregiver_id()
    )
);

CREATE POLICY "Admins can send messages"
ON public.messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Caregivers can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    sender_type = 'caregiver' AND
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND c.caregiver_id = get_current_caregiver_id()
    )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_requests_updated_at
    BEFORE UPDATE ON public.parent_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();