CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  level_group_id uuid;
  pole_group_id uuid;
  filiere_group_id uuid;
  option_group_id uuid;
  user_full_name text;
  user_level text;
  user_pole text;
  user_filiere text;
  user_option text;
BEGIN
  user_full_name := new.raw_user_meta_data->>'full_name';
  user_level := new.raw_user_meta_data->>'level';
  user_pole := new.raw_user_meta_data->>'pole';
  user_filiere := new.raw_user_meta_data->>'filiere';
  user_option := new.raw_user_meta_data->>'option';

  INSERT INTO public.profiles (id, full_name, level, university, academic_year, pole, filiere, option)
  VALUES (
    new.id,
    user_full_name,
    user_level,
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'academic_year',
    user_pole,
    user_filiere,
    user_option
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    level = EXCLUDED.level,
    university = EXCLUDED.university,
    academic_year = EXCLUDED.academic_year,
    pole = EXCLUDED.pole,
    filiere = EXCLUDED.filiere,
    option = EXCLUDED.option,
    updated_at = now();

  INSERT INTO public.chat_groups (name, group_type, level)
  VALUES (user_level || ' - Tous', 'level', user_level)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO level_group_id;

  INSERT INTO public.chat_groups (name, group_type)
  VALUES (user_pole, 'pole')
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO pole_group_id;

  IF user_filiere IS NOT NULL AND user_filiere <> '' THEN
    INSERT INTO public.chat_groups (name, group_type, filiere)
    VALUES (user_filiere, 'filiere', user_filiere)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO filiere_group_id;
  END IF;

  INSERT INTO public.chat_groups (name, group_type, option)
  VALUES (user_option, 'option', user_option)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO option_group_id;

  INSERT INTO public.group_members (group_id, user_id)
  SELECT group_id, new.id
  FROM (VALUES (level_group_id), (pole_group_id), (filiere_group_id), (option_group_id)) AS groups(group_id)
  WHERE group_id IS NOT NULL
  ON CONFLICT (group_id, user_id) DO NOTHING;

  INSERT INTO public.chat_messages (group_id, content, message_type)
  SELECT group_id, COALESCE(user_full_name, 'Un utilisateur') || ' a rejoint le groupe.', 'system'
  FROM (VALUES (level_group_id), (pole_group_id), (filiere_group_id), (option_group_id)) AS groups(group_id)
  WHERE group_id IS NOT NULL;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON TABLE public.chat_groups TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.group_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.chat_messages_id_seq TO anon, authenticated, service_role;

WITH profile_groups AS (
  SELECT p.id AS user_id, g.id AS group_id
  FROM public.profiles p
  JOIN public.chat_groups g ON (
    (g.group_type = 'level' AND g.level = p.level)
    OR (g.group_type = 'pole' AND g.name = p.pole)
    OR (g.group_type = 'filiere' AND g.filiere = p.filiere)
    OR (g.group_type = 'option' AND g.option = p.option)
  )
)
INSERT INTO public.group_members (group_id, user_id)
SELECT group_id, user_id FROM profile_groups
ON CONFLICT (group_id, user_id) DO NOTHING;
