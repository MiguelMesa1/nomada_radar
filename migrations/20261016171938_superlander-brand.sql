-- Superlander is its own catalog group, as requested by the owner.
UPDATE public.post_catalog SET marca='Superlander' WHERE lower(trim(producto))='superlander' AND lower(trim(marca)) IN ('akt','');

CREATE OR REPLACE FUNCTION public.radar_commit_report_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_catalog jsonb DEFAULT NULL,p_interactions jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE interaction_group jsonb; interaction_month text;
BEGIN
 IF p_interactions IS NOT NULL THEN
  IF jsonb_typeof(p_interactions)<>'array' OR jsonb_array_length(p_interactions)>120 THEN RAISE EXCEPTION 'INVALID_INTERACTIONS'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_interactions) AS x(value) GROUP BY value->>'mes' HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_INTERACTION_MONTH'; END IF;
  FOR interaction_group IN SELECT value FROM jsonb_array_elements(p_interactions) LOOP
  interaction_month=interaction_group->>'mes';
  IF interaction_month IS NULL OR interaction_month !~ '^\d{4}-(0[1-9]|1[0-2])$' OR jsonb_typeof(interaction_group->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(interaction_group->'rows')>10000 THEN RAISE EXCEPTION 'INVALID_INTERACTIONS'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(interaction_group->'rows') AS x(post_id text,interacciones bigint)
   WHERE x.post_id IS NULL OR length(trim(x.post_id)) NOT BETWEEN 1 AND 100 OR x.post_id<>upper(trim(x.post_id)) OR x.interacciones IS NULL OR x.interacciones<0 OR x.interacciones>9007199254740991)
  THEN RAISE EXCEPTION 'INVALID_INTERACTIONS'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(interaction_group->'rows') AS x(post_id text) GROUP BY x.post_id HAVING count(*)>1) THEN RAISE EXCEPTION 'DUPLICATE_INTERACTIONS'; END IF;
  END LOOP;
 END IF;

 IF p_catalog IS NULL THEN PERFORM public.radar_commit_sync(p_run,p_sales,p_issues,p_rows,NULL);
 ELSE PERFORM public.radar_commit_sheets_sync(p_run,p_sales,p_issues,p_rows,p_catalog); END IF;

 -- Fill only missing brands. A brand explicitly edited in Radar survives sync.
 UPDATE public.post_catalog SET marca=CASE
  WHEN lower(trim(producto)) IN ('xtz 125','xtz 150','xtz125','xtz150') THEN 'Yamaha'
  WHEN lower(trim(producto)) IN ('pulsar','pulsar 180','pulsar180','ns 200','ns200','boxer ct 100') THEN 'Bajaj'
  WHEN lower(trim(producto))='superlander' THEN 'Superlander' ELSE '' END
 WHERE marca='' AND lower(trim(producto)) IN ('xtz 125','xtz 150','xtz125','xtz150','pulsar','pulsar 180','pulsar180','ns 200','ns200','boxer ct 100','superlander');

 IF p_interactions IS NOT NULL THEN
  FOR interaction_group IN SELECT value FROM jsonb_array_elements(p_interactions) LOOP
  interaction_month=interaction_group->>'mes';
  DELETE FROM public.post_interactions AS old WHERE old.mes=interaction_month
   AND NOT EXISTS(SELECT 1 FROM jsonb_to_recordset(interaction_group->'rows') AS x(post_id text) WHERE x.post_id=old.post_id);
  INSERT INTO public.post_interactions(post_id,mes,interacciones)
   SELECT x.post_id,interaction_month,x.interacciones FROM jsonb_to_recordset(interaction_group->'rows') AS x(post_id text,interacciones bigint)
   ON CONFLICT(post_id,mes) DO UPDATE SET interacciones=EXCLUDED.interacciones,updated_at=now();
  END LOOP;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.radar_commit_report_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_report_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb) TO project_admin;
