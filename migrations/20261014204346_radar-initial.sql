CREATE TABLE public.user_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 nombre text NOT NULL CHECK(length(nombre) BETWEEN 1 AND 100),
 email text NOT NULL,
 role text NOT NULL CHECK(role IN ('principal','analista','visualizador')),
 activo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.post_catalog (
 post_id text PRIMARY KEY CHECK(length(post_id) BETWEEN 1 AND 100 AND post_id=upper(trim(post_id))),
 nombre_creativo text NOT NULL CHECK(length(nombre_creativo) BETWEEN 1 AND 180),
 campana text NOT NULL DEFAULT '', producto text NOT NULL DEFAULT '', plataforma text NOT NULL DEFAULT 'Otra',
 activo boolean NOT NULL DEFAULT true, fecha_inicio date NOT NULL DEFAULT current_date
);
CREATE TABLE public.sales_orders (
 pedido_id text PRIMARY KEY, fecha_venta timestamptz NOT NULL, post_id text NOT NULL DEFAULT '',
 ciudad_original text NOT NULL DEFAULT '', ciudad_normalizada text NOT NULL DEFAULT '', departamento text NOT NULL DEFAULT '',
 importe_cop bigint NOT NULL CHECK(importe_cop>=0), estado text NOT NULL, linea text NOT NULL DEFAULT '',
 ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_orders_date_idx ON public.sales_orders(fecha_venta);
CREATE INDEX sales_orders_post_idx ON public.sales_orders(post_id,fecha_venta);
CREATE TABLE public.city_aliases(alias text NOT NULL,ciudad_canonica text NOT NULL,departamento text NOT NULL,PRIMARY KEY(alias,departamento));
CREATE TABLE public.sync_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), started_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 status text NOT NULL CHECK(status IN ('running','success','failed')), filas_leidas integer NOT NULL DEFAULT 0,
 filas_validas integer NOT NULL DEFAULT 0,error text,actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TABLE public.sync_lock(id boolean PRIMARY KEY DEFAULT true CHECK(id),run_id uuid REFERENCES public.sync_runs(id),lease_until timestamptz NOT NULL);
CREATE TABLE public.data_quality_issues(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,run_id uuid NOT NULL REFERENCES public.sync_runs(id),pedido_id text,tipo text NOT NULL,source_sheet text,source_row integer,message text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.audit_logs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,accion text NOT NULL,objeto text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.radar_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$ SELECT role FROM public.user_profiles WHERE user_id=auth.uid() AND activo=true $$;
REVOKE ALL ON FUNCTION public.radar_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.radar_role() TO authenticated;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_profiles,public.post_catalog,public.sales_orders,public.city_aliases,public.sync_runs,public.sync_lock,public.data_quality_issues,public.audit_logs FROM anon,authenticated;
GRANT SELECT ON public.user_profiles,public.post_catalog,public.sales_orders,public.city_aliases,public.sync_runs,public.data_quality_issues,public.audit_logs TO authenticated;
GRANT INSERT,UPDATE ON public.post_catalog,public.city_aliases TO authenticated;
CREATE POLICY profiles_read ON public.user_profiles FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.radar_role()='principal');
CREATE POLICY catalog_read ON public.post_catalog FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);
CREATE POLICY catalog_insert ON public.post_catalog FOR INSERT TO authenticated WITH CHECK(public.radar_role() IN ('principal','analista'));
CREATE POLICY catalog_update ON public.post_catalog FOR UPDATE TO authenticated USING(public.radar_role() IN ('principal','analista')) WITH CHECK(public.radar_role() IN ('principal','analista'));
CREATE POLICY orders_read ON public.sales_orders FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);
CREATE POLICY aliases_read ON public.city_aliases FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);
CREATE POLICY aliases_insert ON public.city_aliases FOR INSERT TO authenticated WITH CHECK(public.radar_role() IN ('principal','analista'));
CREATE POLICY aliases_update ON public.city_aliases FOR UPDATE TO authenticated USING(public.radar_role() IN ('principal','analista')) WITH CHECK(public.radar_role() IN ('principal','analista'));
CREATE POLICY sync_read ON public.sync_runs FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);
CREATE POLICY issues_read ON public.data_quality_issues FOR SELECT TO authenticated USING(public.radar_role() IN ('principal','analista'));
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING(public.radar_role()='principal');
CREATE FUNCTION public.radar_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 INSERT INTO public.audit_logs(actor_id,accion,objeto) VALUES(auth.uid(),lower(TG_OP)||':'||TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'post_id',to_jsonb(NEW)->>'alias',to_jsonb(NEW)->>'user_id'));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.radar_audit() FROM PUBLIC;
CREATE TRIGGER catalog_audit AFTER INSERT OR UPDATE ON public.post_catalog FOR EACH ROW EXECUTE FUNCTION public.radar_audit();
CREATE TRIGGER aliases_audit AFTER INSERT OR UPDATE ON public.city_aliases FOR EACH ROW EXECUTE FUNCTION public.radar_audit();
CREATE TRIGGER profiles_audit AFTER INSERT OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.radar_audit();
CREATE FUNCTION public.radar_guard_principal() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF OLD.role='principal' AND OLD.activo AND (NEW.role<>'principal' OR NOT NEW.activo) THEN
  PERFORM pg_advisory_xact_lock(720428);
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE role='principal' AND activo AND user_id<>OLD.user_id) THEN RAISE EXCEPTION 'An active principal must remain'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.radar_guard_principal();
CREATE FUNCTION public.radar_authorize_user(p_actor uuid,p_user uuid,p_name text,p_email text,p_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=p_actor AND role='principal' AND activo) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=lower(p_email)) THEN RAISE EXCEPTION 'Identity mismatch'; END IF;
 INSERT INTO public.user_profiles(user_id,nombre,email,role) VALUES(p_user,p_name,p_email,p_role);
END $$;
REVOKE ALL ON FUNCTION public.radar_authorize_user(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_authorize_user(uuid,uuid,text,text,text) TO project_admin;
CREATE FUNCTION public.radar_begin_sync(p_actor uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE run uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(720429);
 IF EXISTS(SELECT 1 FROM public.sync_lock WHERE lease_until>now()) THEN RAISE EXCEPTION 'Sync already running'; END IF;
 UPDATE public.sync_runs SET status='failed',completed_at=now(),error='La ejecución anterior excedió el tiempo de espera.' WHERE status='running';
 INSERT INTO public.sync_runs(status,actor_id) VALUES('running',p_actor) RETURNING id INTO run;
 INSERT INTO public.sync_lock(id,run_id,lease_until) VALUES(true,run,now()+interval '3 minutes') ON CONFLICT(id) DO UPDATE SET run_id=EXCLUDED.run_id,lease_until=EXCLUDED.lease_until;
 RETURN run;
END $$;
CREATE FUNCTION public.radar_commit_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_actor uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE run uuid;
BEGIN
 SELECT run_id INTO run FROM public.sync_lock WHERE id=true AND run_id=p_run AND lease_until>now() FOR UPDATE;
 IF run IS NULL THEN RAISE EXCEPTION 'Missing active sync lease'; END IF;
 INSERT INTO public.sales_orders(pedido_id,fecha_venta,post_id,ciudad_original,ciudad_normalizada,departamento,importe_cop,estado,linea)
 SELECT x.pedido_id,x.fecha_venta,x.post_id,x.ciudad_original,x.ciudad_normalizada,x.departamento,x.importe_cop,x.estado,x.linea FROM jsonb_to_recordset(p_sales) AS x(pedido_id text,fecha_venta timestamptz,post_id text,ciudad_original text,ciudad_normalizada text,departamento text,importe_cop bigint,estado text,linea text)
 ON CONFLICT(pedido_id) DO UPDATE SET fecha_venta=EXCLUDED.fecha_venta,post_id=EXCLUDED.post_id,ciudad_original=EXCLUDED.ciudad_original,ciudad_normalizada=EXCLUDED.ciudad_normalizada,departamento=EXCLUDED.departamento,importe_cop=EXCLUDED.importe_cop,estado=EXCLUDED.estado,linea=EXCLUDED.linea,ingested_at=now();
 INSERT INTO public.data_quality_issues(run_id,pedido_id,tipo,source_sheet,source_row,message)
 SELECT run,x.pedido_id,x.type,x.sheet,x.row,x.message FROM jsonb_to_recordset(p_issues) AS x(pedido_id text,type text,sheet text,row integer,message text);
 UPDATE public.sync_runs SET status='success',completed_at=now(),filas_leidas=p_rows,filas_validas=jsonb_array_length(p_sales) WHERE id=run;
 INSERT INTO public.audit_logs(actor_id,accion,objeto) VALUES(p_actor,'sync:success',run::text);
 DELETE FROM public.sync_lock WHERE id=true;
END $$;
CREATE FUNCTION public.radar_fail_sync(p_run uuid,p_error text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE run uuid;
BEGIN
 SELECT run_id INTO run FROM public.sync_lock WHERE id=true AND run_id=p_run FOR UPDATE;
 UPDATE public.sync_runs SET status='failed',completed_at=now(),error=left(p_error,500) WHERE id=run;
 DELETE FROM public.sync_lock WHERE id=true AND run_id=p_run;
END $$;
REVOKE ALL ON FUNCTION public.radar_begin_sync(uuid),public.radar_commit_sync(uuid,jsonb,jsonb,integer,uuid),public.radar_fail_sync(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_begin_sync(uuid),public.radar_commit_sync(uuid,jsonb,jsonb,integer,uuid),public.radar_fail_sync(uuid,text) TO project_admin;
