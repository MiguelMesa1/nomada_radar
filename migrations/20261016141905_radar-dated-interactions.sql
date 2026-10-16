CREATE TABLE public.post_interaction_days(
 post_id text NOT NULL CHECK(length(post_id) BETWEEN 1 AND 100 AND post_id=upper(trim(post_id))),
 fecha date NOT NULL,
 interacciones bigint NOT NULL CHECK(interacciones BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(post_id,fecha)
);
CREATE INDEX post_interaction_days_date_idx ON public.post_interaction_days(fecha);
CREATE TABLE public.post_interaction_coverage(
 mes text PRIMARY KEY CHECK(mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 sin_fecha integer NOT NULL CHECK(sin_fecha>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_interaction_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_interaction_coverage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_interaction_days,public.post_interaction_coverage FROM anon,authenticated;
GRANT SELECT ON public.post_interaction_days,public.post_interaction_coverage TO authenticated;
CREATE POLICY interaction_days_read ON public.post_interaction_days FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);
CREATE POLICY interaction_coverage_read ON public.post_interaction_coverage FOR SELECT TO authenticated USING(public.radar_role() IS NOT NULL);

CREATE FUNCTION public.radar_commit_dated_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_catalog jsonb DEFAULT NULL,p_interactions jsonb DEFAULT NULL,p_daily_interactions jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE block jsonb; month_key text;
BEGIN
 IF p_daily_interactions IS NULL OR jsonb_typeof(p_daily_interactions)<>'array' OR jsonb_array_length(p_daily_interactions)>120 THEN RAISE EXCEPTION 'INVALID_DAILY_INTERACTIONS'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_daily_interactions) AS x(value) GROUP BY value->>'mes' HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_DAILY_MONTH'; END IF;
 FOR block IN SELECT value FROM jsonb_array_elements(p_daily_interactions) LOOP
  month_key=block->>'mes';
  IF month_key IS NULL OR month_key !~ '^\d{4}-(0[1-9]|1[0-2])$' OR (block->>'sin_fecha') IS NULL OR (block->>'sin_fecha')::integer<0 OR jsonb_typeof(block->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(block->'rows')>50000 THEN RAISE EXCEPTION 'INVALID_DAILY_INTERACTIONS'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(block->'rows') AS x(post_id text,fecha date,interacciones bigint)
   WHERE x.post_id IS NULL OR length(trim(x.post_id)) NOT BETWEEN 1 AND 100 OR x.post_id<>upper(trim(x.post_id)) OR x.fecha IS NULL OR to_char(x.fecha,'YYYY-MM')<>month_key OR x.interacciones IS NULL OR x.interacciones<1 OR x.interacciones>9007199254740991)
  THEN RAISE EXCEPTION 'INVALID_DAILY_INTERACTIONS'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(block->'rows') AS x(post_id text,fecha date) GROUP BY x.post_id,x.fecha HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_DAILY_INTERACTIONS'; END IF;
 END LOOP;
 PERFORM public.radar_commit_report_sync(p_run,p_sales,p_issues,p_rows,p_catalog,p_interactions);
 FOR block IN SELECT value FROM jsonb_array_elements(p_daily_interactions) LOOP
  month_key=block->>'mes';
  DELETE FROM public.post_interaction_days AS old WHERE old.fecha>=to_date(month_key||'-01','YYYY-MM-DD') AND old.fecha<(to_date(month_key||'-01','YYYY-MM-DD')+interval '1 month')
   AND NOT EXISTS(SELECT 1 FROM jsonb_to_recordset(block->'rows') AS x(post_id text,fecha date) WHERE x.post_id=old.post_id AND x.fecha=old.fecha);
  INSERT INTO public.post_interaction_days(post_id,fecha,interacciones)
   SELECT x.post_id,x.fecha,x.interacciones FROM jsonb_to_recordset(block->'rows') AS x(post_id text,fecha date,interacciones bigint)
   ON CONFLICT(post_id,fecha) DO UPDATE SET interacciones=EXCLUDED.interacciones;
  INSERT INTO public.post_interaction_coverage(mes,sin_fecha) VALUES(month_key,(block->>'sin_fecha')::integer)
   ON CONFLICT(mes) DO UPDATE SET sin_fecha=EXCLUDED.sin_fecha,updated_at=now();
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.radar_commit_dated_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_dated_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb,jsonb) TO project_admin;
