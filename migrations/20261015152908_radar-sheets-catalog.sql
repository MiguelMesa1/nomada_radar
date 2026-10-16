-- Mark only IDs adopted by the Sheets catalog; unrelated manual entries survive.
ALTER TABLE public.post_catalog ADD COLUMN sheets_managed boolean NOT NULL DEFAULT false;
REVOKE INSERT,UPDATE ON public.post_catalog FROM authenticated;
GRANT INSERT(post_id,nombre_creativo,campana,producto,plataforma,activo,fecha_inicio),
      UPDATE(post_id,nombre_creativo,campana,producto,plataforma,activo,fecha_inicio)
ON public.post_catalog TO authenticated;

CREATE FUNCTION public.radar_commit_sheets_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_catalog jsonb)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF jsonb_typeof(p_catalog) IS DISTINCT FROM 'array' OR jsonb_array_length(p_catalog)>10000 THEN
  RAISE EXCEPTION 'INVALID_CATALOG';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_catalog) AS x(post_id text,producto text)
  WHERE x.post_id IS NULL OR length(trim(x.post_id)) NOT BETWEEN 1 AND 100 OR x.post_id<>upper(trim(x.post_id))
  OR x.producto IS NULL OR length(trim(x.producto)) NOT BETWEEN 1 AND 120) THEN RAISE EXCEPTION 'INVALID_CATALOG'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_catalog) AS x(post_id text) GROUP BY x.post_id HAVING count(*)>1)
 THEN RAISE EXCEPTION 'DUPLICATE_CATALOG_ID'; END IF;

 -- The existing sales commit and the catalog below are one transaction. A
 -- failure rolls back the lease release and success status as well as all data.
 PERFORM public.radar_commit_sync(p_run,p_sales,p_issues,p_rows,NULL);
 INSERT INTO public.post_catalog AS existing(post_id,nombre_creativo,producto,sheets_managed)
 SELECT x.post_id,x.post_id,x.producto,true FROM jsonb_to_recordset(p_catalog) AS x(post_id text,producto text)
 ON CONFLICT(post_id) DO UPDATE SET producto=EXCLUDED.producto,activo=true,sheets_managed=true
 WHERE existing.producto IS DISTINCT FROM EXCLUDED.producto OR NOT existing.activo OR NOT existing.sheets_managed;

 UPDATE public.post_catalog AS existing SET activo=false
 WHERE existing.sheets_managed AND existing.activo
 AND NOT EXISTS(SELECT 1 FROM jsonb_to_recordset(p_catalog) AS x(post_id text) WHERE x.post_id=existing.post_id);
END $$;
REVOKE ALL ON FUNCTION public.radar_commit_sheets_sync(uuid,jsonb,jsonb,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_sheets_sync(uuid,jsonb,jsonb,integer,jsonb) TO project_admin;
