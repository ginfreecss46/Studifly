ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.assignments a
SET user_id = c.owner_id
FROM public.courses c
WHERE a.course_id = c.id
  AND a.user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.assignment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote integer NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

ALTER TABLE public.assignment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignment votes" ON public.assignment_votes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.profiles author ON author.id = a.user_id
    JOIN public.profiles viewer ON viewer.id = auth.uid()
    WHERE a.id = assignment_votes.assignment_id
      AND author.level IS NOT DISTINCT FROM viewer.level
      AND author.filiere IS NOT DISTINCT FROM viewer.filiere
      AND author.option IS NOT DISTINCT FROM viewer.option
  )
);

CREATE POLICY "Users can insert their own assignment votes" ON public.assignment_votes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignment votes" ON public.assignment_votes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignment votes" ON public.assignment_votes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
