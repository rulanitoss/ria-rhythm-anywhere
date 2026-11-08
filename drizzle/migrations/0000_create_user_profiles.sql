CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,30}$'),
 display_name text NOT NULL DEFAULT '',
 avatar text NOT NULL DEFAULT '🎵',
 favorite_music text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE FUNCTION public.create_signup_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles (id, username, display_name) VALUES (NEW.id, split_part(NEW.email, '@', 1), COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_signup_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_riamp_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_signup_profile();