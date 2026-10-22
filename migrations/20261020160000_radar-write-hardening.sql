-- Apply the same direct-SDK write budget to the recently added tables.
CREATE TRIGGER lines_write_rate BEFORE INSERT ON public.line_catalog
 FOR EACH ROW EXECUTE FUNCTION public.radar_guard_write_rate();
CREATE TRIGGER sale_lines_write_rate BEFORE INSERT OR UPDATE ON public.sale_line_overrides
 FOR EACH ROW EXECUTE FUNCTION public.radar_guard_write_rate();

-- Preserve SDK upserts while rejecting moves to a different source row.
CREATE FUNCTION public.radar_guard_sale_line_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF OLD.pedido_id IS DISTINCT FROM NEW.pedido_id OR OLD.fecha_venta IS DISTINCT FROM NEW.fecha_venta
  THEN RAISE EXCEPTION 'A correction cannot move to another source row'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.radar_guard_sale_line_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sale_lines_identity BEFORE UPDATE ON public.sale_line_overrides
 FOR EACH ROW EXECUTE FUNCTION public.radar_guard_sale_line_identity();

CREATE FUNCTION public.radar_audit_line_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 INSERT INTO public.audit_logs(actor_id,accion,objeto)
 VALUES(auth.uid(),lower(TG_OP)||':'||TG_TABLE_NAME,
  CASE WHEN TG_TABLE_NAME='line_catalog' THEN to_jsonb(NEW)->>'nombre' ELSE to_jsonb(NEW)->>'pedido_id' END);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.radar_audit_line_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lines_audit AFTER INSERT ON public.line_catalog
 FOR EACH ROW EXECUTE FUNCTION public.radar_audit_line_change();
CREATE TRIGGER sale_lines_audit AFTER INSERT OR UPDATE ON public.sale_line_overrides
 FOR EACH ROW EXECUTE FUNCTION public.radar_audit_line_change();

-- Permission changes and their accountable audit entry commit atomically.
CREATE FUNCTION public.radar_update_access(p_actor uuid,p_user uuid,p_role text DEFAULT NULL,p_active boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=p_actor AND role='principal' AND activo)
  OR p_actor=p_user THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF (p_role IS NULL AND p_active IS NULL) OR (p_role IS NOT NULL AND p_role NOT IN ('principal','analista','visualizador'))
  THEN RAISE EXCEPTION 'Invalid access change'; END IF;
 UPDATE public.user_profiles SET role=coalesce(p_role,role),activo=coalesce(p_active,activo) WHERE user_id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 INSERT INTO public.audit_logs(actor_id,accion,objeto) VALUES(p_actor,'update:access',p_user::text);
END $$;
REVOKE ALL ON FUNCTION public.radar_update_access(uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_update_access(uuid,uuid,text,boolean) TO project_admin;
