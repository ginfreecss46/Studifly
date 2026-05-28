


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  level_group_id UUID;
  pole_group_id UUID;
  filiere_group_id UUID;
  option_group_id UUID;
  user_full_name TEXT;
  user_pole TEXT;
  user_filiere TEXT;
  user_option TEXT;
BEGIN
  -- Get user's metadata
  user_full_name := new.raw_user_meta_data->>'full_name';
  user_pole := new.raw_user_meta_data->>'pole';
  user_filiere := new.raw_user_meta_data->>'filiere';
  user_option := new.raw_user_meta_data->>'option';

  -- Insert into profiles
  insert into public.profiles (id, full_name, level, pole, filiere, option)
  values (
    new.id,
    user_full_name,
    new.raw_user_meta_data->>'level',
    user_pole,
    user_filiere,
    user_option
  );

  -- Find or create level group
  INSERT INTO public.chat_groups (name, group_type, level)
  VALUES (new.raw_user_meta_data->>'level' || ' - Tous', 'level', new.raw_user_meta_data->>'level')
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO level_group_id;

  -- Find or create pole group
  INSERT INTO public.chat_groups (name, group_type)
  VALUES (user_pole, 'pole')
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO pole_group_id;

  -- Find or create filiere group
  INSERT INTO public.chat_groups (name, group_type, filiere)
  VALUES (user_filiere, 'filiere', user_filiere)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO filiere_group_id;

  -- Find or create option group
  INSERT INTO public.chat_groups (name, group_type, option)
  VALUES (user_option, 'option', user_option)
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO option_group_id;

  -- Add user to the groups
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (level_group_id, new.id), (pole_group_id, new.id), (filiere_group_id, new.id), (option_group_id, new.id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Post system message to groups
  INSERT INTO public.chat_messages (group_id, content, message_type)
  VALUES
    (level_group_id, user_full_name || ' a rejoint le groupe.', 'system'),
    (pole_group_id, user_full_name || ' a rejoint le groupe.', 'system'),
    (filiere_group_id, user_full_name || ' a rejoint le groupe.', 'system'),
    (option_group_id, user_full_name || ' a rejoint le groupe.', 'system');

  -- NOTE: The super group logic based on the old 'major' field is now removed.
  -- This can be re-added later based on one of the new fields if needed.

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."class_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner_id" "uuid"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "post_id" "uuid",
    "title" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_post_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."forum_post_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."forum_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "grade" double precision,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "reaction_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reply_id" "uuid",
    CONSTRAINT "post_reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['like'::"text", 'dislike'::"text", 'love'::"text", 'laugh'::"text", 'angry'::"text"]))),
    CONSTRAINT "post_id_or_reply_id_check" CHECK ((((post_id IS NOT NULL) AND (reply_id IS NULL)) OR ((post_id IS NULL) AND (reply_id IS NOT NULL))))
);


ALTER TABLE "public"."post_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "level" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "university" "text",
    "academic_year" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "push_token" "text",
    "avatar_url" "text",
    "profile_last_updated_at" timestamp with time zone,
    "pole" "text",
    "filiere" "text",
    "option" "text",
    "assignment_reminder_preference" "text" DEFAULT '1_day_before',
    "forum_reply_notifications_enabled" boolean DEFAULT true,
    "new_grade_notifications_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_courses" (
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_courses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_schedules"
    ADD CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_post_replies"
    ADD CONSTRAINT "forum_post_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_courses"
    ADD CONSTRAINT "user_courses_pkey" PRIMARY KEY ("user_id", "course_id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_schedules"
    ADD CONSTRAINT "class_schedules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_post_replies"
    ADD CONSTRAINT "forum_post_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_post_replies"
    ADD CONSTRAINT "forum_post_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_post_replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_courses"
    ADD CONSTRAINT "user_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_courses"
    ADD CONSTRAINT "user_courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Course members can insert forum posts" ON "public"."forum_posts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_courses"
  WHERE (("user_courses"."course_id" = "forum_posts"."course_id") AND ("user_courses"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can insert forum replies" ON "public"."forum_post_replies" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_courses" "uc"
     JOIN "public"."forum_posts" "fp" ON (("uc"."course_id" = "fp"."course_id")))
  WHERE (("fp"."id" = "forum_post_replies"."post_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can insert post reactions" ON "public"."post_reactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_courses" "uc"
     JOIN "public"."forum_posts" "fp" ON (("uc"."course_id" = "fp"."course_id")))
  WHERE (("fp"."id" = "post_reactions"."post_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can view documents" ON "public"."documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_courses"
  WHERE (("user_courses"."course_id" = "documents"."course_id") AND ("user_courses"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can view forum posts" ON "public"."forum_posts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_courses"
  WHERE (("user_courses"."course_id" = "forum_posts"."course_id") AND ("user_courses"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can view forum replies" ON "public"."forum_post_replies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_courses" "uc"
     JOIN "public"."forum_posts" "fp" ON (("uc"."course_id" = "fp"."course_id")))
  WHERE (("fp"."id" = "forum_post_replies"."post_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course members can view post reactions" ON "public"."post_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_courses" "uc"
     JOIN "public"."forum_posts" "fp" ON (("uc"."course_id" = "fp"."course_id")))
  WHERE (("fp"."id" = "post_reactions"."post_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can delete assignments" ON "public"."assignments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "assignments"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can delete documents" ON "public"."documents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "documents"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can delete schedules" ON "public"."class_schedules" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "class_schedules"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can insert assignments" ON "public"."assignments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "assignments"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can insert documents" ON "public"."documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "documents"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can insert schedules" ON "public"."class_schedules" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "class_schedules"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can update assignments" ON "public"."assignments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "assignments"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can update documents" ON "public"."documents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "documents"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Course owners can update schedules" ON "public"."class_schedules" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "class_schedules"."course_id") AND ("courses"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Owners can delete their own courses" ON "public"."courses" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Owners can update their own courses" ON "public"."courses" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Students can view their own grades" ON "public"."grades" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Teachers can delete grades in their courses" ON "public"."grades" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."courses" "c"
     JOIN "public"."assignments" "a" ON (("c"."id" = "a"."course_id")))
  WHERE (("a"."id" = "grades"."assignment_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can insert grades in their courses" ON "public"."grades" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."courses" "c"
     JOIN "public"."assignments" "a" ON (("c"."id" = "a"."course_id")))
  WHERE (("a"."id" = "grades"."assignment_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update grades in their courses" ON "public"."grades" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."courses" "c"
     JOIN "public"."assignments" "a" ON (("c"."id" = "a"."course_id")))
  WHERE (("a"."id" = "grades"."assignment_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can view grades in their courses" ON "public"."grades" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."courses" "c"
     JOIN "public"."assignments" "a" ON (("c"."id" = "a"."course_id")))
  WHERE (("a"."id" = "grades"."assignment_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own forum post replies" ON "public"."forum_post_replies" FOR DELETE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete their own forum posts" ON "public"."forum_posts" FOR DELETE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can delete their own post reactions" ON "public"."post_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own user_courses" ON "public"."user_courses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own courses" ON "public"."courses" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert their own user_courses" ON "public"."user_courses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own forum post replies" ON "public"."forum_post_replies" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own forum posts" ON "public"."forum_posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own post reactions" ON "public"."post_reactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles" FOR SELECT USING ((auth.role() = 'authenticated'::text));



CREATE POLICY "Users can view all courses" ON "public"."courses" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view all courses." ON "public"."courses" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view assignments for their courses" ON "public"."assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_courses"
  WHERE (("user_courses"."course_id" = "assignments"."course_id") AND ("user_courses"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view schedules for their courses" ON "public"."class_schedules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_courses"
  WHERE (("user_courses"."course_id" = "class_schedules"."course_id") AND ("user_courses"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own user_courses" ON "public"."user_courses" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_post_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_courses" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."class_schedules" TO "anon";
GRANT ALL ON TABLE "public"."class_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."class_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."forum_post_replies" TO "anon";
GRANT ALL ON TABLE "public"."forum_post_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_post_replies" TO "service_role";



GRANT ALL ON TABLE "public"."forum_posts" TO "anon";
GRANT ALL ON TABLE "public"."forum_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_posts" TO "service_role";



GRANT ALL ON TABLE "public"."grades" TO "anon";
GRANT ALL ON TABLE "public"."grades" TO "authenticated";
GRANT ALL ON TABLE "public"."grades" TO "service_role";



GRANT ALL ON TABLE "public"."post_reactions" TO "anon";
GRANT ALL ON TABLE "public"."post_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."post_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_courses" TO "anon";
GRANT ALL ON TABLE "public"."user_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_courses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;

-- Chat Tables
CREATE TABLE public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL, -- 'level', 'pole', 'filiere', or 'option'
  level TEXT,
  filiere TEXT,
  option TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  message_type TEXT DEFAULT 'text' NOT NULL
);


ALTER TABLE ONLY public.chat_groups ADD CONSTRAINT chat_groups_name_key UNIQUE (name);





ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- User Events Table
CREATE TABLE IF NOT EXISTS "public"."user_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "title" "text" NOT NULL,
    "description" "text",
    "date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."user_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own events" ON "public"."user_events" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert their own events" ON "public"."user_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own events" ON "public"."user_events" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own events" ON "public"."user_events" FOR DELETE USING (("auth"."uid"() = "user_id"));

ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_pkey" PRIMARY KEY ("id");

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
