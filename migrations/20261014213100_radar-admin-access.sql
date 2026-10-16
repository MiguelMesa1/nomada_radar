CREATE FUNCTION public.radar_bootstrap_principal(p_email text,p_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(720428);
 IF EXISTS(SELECT 1 FROM public.user_profiles) THEN RAISE EXCEPTION 'Radar already initialized'; END IF;
 SELECT id INTO target FROM auth.users WHERE lower(email)=lower(p_email);
 IF target IS NULL THEN RAISE EXCEPTION 'Create the Auth account first'; END IF;
 INSERT INTO public.user_profiles(user_id,nombre,email,role) VALUES(target,p_name,p_email,'principal');
 RETURN target;
END $$;
CREATE FUNCTION public.radar_authorize_email(p_actor uuid,p_email text,p_name text,p_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE target uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=p_actor AND role='principal' AND activo) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT id INTO target FROM auth.users WHERE lower(email)=lower(p_email);
 IF target IS NULL THEN RAISE EXCEPTION 'Auth account not found'; END IF;
 INSERT INTO public.user_profiles(user_id,nombre,email,role) VALUES(target,p_name,p_email,p_role);
 INSERT INTO public.audit_logs(actor_id,accion,objeto) VALUES(p_actor,'authorize:user',target::text);
END $$;
REVOKE ALL ON FUNCTION public.radar_bootstrap_principal(text,text),public.radar_authorize_email(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_bootstrap_principal(text,text),public.radar_authorize_email(uuid,text,text,text) TO project_admin;
