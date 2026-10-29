CREATE TABLE public.user_login_activity (
 user_id uuid PRIMARY KEY REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
 last_login_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_login_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_login_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_login_activity TO authenticated;
CREATE POLICY login_activity_principal_read ON public.user_login_activity
 FOR SELECT TO authenticated USING (public.radar_role()='principal');

-- Only the server can record a successful, authorized password sign-in.
CREATE FUNCTION public.radar_record_login(p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
 INSERT INTO public.user_login_activity(user_id,last_login_at)
 SELECT user_id,clock_timestamp() FROM public.user_profiles WHERE user_id=p_user AND activo
 ON CONFLICT(user_id) DO UPDATE SET last_login_at=EXCLUDED.last_login_at
 WHERE public.user_login_activity.last_login_at<EXCLUDED.last_login_at;
$$;
REVOKE ALL ON FUNCTION public.radar_record_login(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.radar_record_login(uuid) TO project_admin;
