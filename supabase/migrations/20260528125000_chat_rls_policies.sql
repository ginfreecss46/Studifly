ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their group memberships" ON public.group_members;
CREATE POLICY "Users can view their group memberships" ON public.group_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join their own groups" ON public.group_members;
CREATE POLICY "Users can join their own groups" ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view joined chat groups" ON public.chat_groups;
CREATE POLICY "Users can view joined chat groups" ON public.chat_groups
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = chat_groups.id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view messages in joined groups" ON public.chat_messages;
CREATE POLICY "Users can view messages in joined groups" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = chat_messages.group_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can send messages to joined groups" ON public.chat_messages;
CREATE POLICY "Users can send messages to joined groups" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = chat_messages.group_id
      AND gm.user_id = auth.uid()
  )
);
