-- Keep sales, identifiers, source-row guards, audits and sync summaries intact.
-- Only issue detail from old hourly snapshots is retired; the latest successful
-- snapshot remains. A private export is taken before applying to existing data.
SET LOCAL lock_timeout='5s';
-- Repack only derived diagnostics, releasing their old heap/index files at
-- commit. Sales are never truncated, deleted, recreated or renumbered.
LOCK TABLE public.sync_lock IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.data_quality_issues IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE radar_quality_latest ON COMMIT DROP AS
 SELECT * FROM public.data_quality_issues
 WHERE run_id=(SELECT id FROM public.sync_runs WHERE status='success' ORDER BY completed_at DESC,id DESC LIMIT 1);
TRUNCATE TABLE public.data_quality_issues;
INSERT INTO public.data_quality_issues(id,run_id,pedido_id,tipo,source_sheet,source_row,message,created_at) OVERRIDING SYSTEM VALUE
 SELECT id,run_id,pedido_id,tipo,source_sheet,source_row,message,created_at FROM radar_quality_latest;
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON public.sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS data_quality_run_idx ON public.data_quality_issues(run_id);

CREATE OR REPLACE FUNCTION public.radar_commit_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_actor uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE run uuid;
BEGIN
 SELECT run_id INTO run FROM public.sync_lock WHERE id=true AND run_id=p_run AND lease_until>now() FOR UPDATE;
 IF run IS NULL THEN RAISE EXCEPTION 'Missing active sync lease'; END IF;
 -- Without a business order ID, each occupied source row is a distinct sale.
 -- Reject missing coordinates instead of retaining stale rows and double-counting.
 IF EXISTS (
  WITH incoming AS MATERIALIZED (
   SELECT x.pedido_id FROM jsonb_to_recordset(p_sales) AS x(pedido_id text)
  )
  SELECT 1 FROM public.sales_orders AS existing
  LEFT JOIN incoming ON incoming.pedido_id=existing.pedido_id
  WHERE starts_with(existing.pedido_id,'__fila__:') AND incoming.pedido_id IS NULL
 ) THEN RAISE EXCEPTION 'SOURCE_ROWS_MISSING'; END IF;

 INSERT INTO public.sales_orders AS existing(pedido_id,fecha_venta,post_id,ciudad_original,ciudad_normalizada,departamento,importe_cop,estado,linea)
 SELECT x.pedido_id,x.fecha_venta,x.post_id,x.ciudad_original,x.ciudad_normalizada,x.departamento,x.importe_cop,x.estado,x.linea FROM jsonb_to_recordset(p_sales) AS x(pedido_id text,fecha_venta timestamptz,post_id text,ciudad_original text,ciudad_normalizada text,departamento text,importe_cop bigint,estado text,linea text)
 ON CONFLICT(pedido_id) DO UPDATE SET fecha_venta=EXCLUDED.fecha_venta,post_id=EXCLUDED.post_id,ciudad_original=EXCLUDED.ciudad_original,ciudad_normalizada=EXCLUDED.ciudad_normalizada,departamento=EXCLUDED.departamento,importe_cop=EXCLUDED.importe_cop,estado=EXCLUDED.estado,linea=EXCLUDED.linea,ingested_at=now()
 WHERE (existing.fecha_venta,existing.post_id,existing.ciudad_original,existing.ciudad_normalizada,existing.departamento,existing.importe_cop,existing.estado,existing.linea)
 IS DISTINCT FROM (EXCLUDED.fecha_venta,EXCLUDED.post_id,EXCLUDED.ciudad_original,EXCLUDED.ciudad_normalizada,EXCLUDED.departamento,EXCLUDED.importe_cop,EXCLUDED.estado,EXCLUDED.linea);
 -- Keep one current quality snapshot, not another copy on every hourly load.
 -- EXCEPT ALL preserves multiplicity: distinct source rows are never merged.
 IF EXISTS (
  (SELECT x.pedido_id,x.type,x.sheet,x.row,x.message
   FROM jsonb_to_recordset(p_issues) AS x(pedido_id text,type text,sheet text,row integer,message text)
   EXCEPT ALL SELECT pedido_id,tipo,source_sheet,source_row,message FROM public.data_quality_issues)
  UNION ALL
  (SELECT pedido_id,tipo,source_sheet,source_row,message FROM public.data_quality_issues
   EXCEPT ALL SELECT x.pedido_id,x.type,x.sheet,x.row,x.message
   FROM jsonb_to_recordset(p_issues) AS x(pedido_id text,type text,sheet text,row integer,message text))
 ) THEN
  DELETE FROM public.data_quality_issues;
  INSERT INTO public.data_quality_issues(run_id,pedido_id,tipo,source_sheet,source_row,message)
  SELECT run,x.pedido_id,x.type,x.sheet,x.row,x.message
  FROM jsonb_to_recordset(p_issues) AS x(pedido_id text,type text,sheet text,row integer,message text);
 END IF;
 UPDATE public.sync_runs SET status='success',completed_at=now(),filas_leidas=p_rows,filas_validas=jsonb_array_length(p_sales) WHERE id=run;
 INSERT INTO public.audit_logs(actor_id,accion,objeto) VALUES(p_actor,'sync:success',run::text);
 DELETE FROM public.sync_lock WHERE id=true;
END $$;

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
  INSERT INTO public.post_interactions AS existing(post_id,mes,interacciones)
   SELECT x.post_id,interaction_month,x.interacciones FROM jsonb_to_recordset(interaction_group->'rows') AS x(post_id text,interacciones bigint)
   ON CONFLICT(post_id,mes) DO UPDATE SET interacciones=EXCLUDED.interacciones,updated_at=now()
   WHERE existing.interacciones IS DISTINCT FROM EXCLUDED.interacciones;
  END LOOP;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.radar_commit_report_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_report_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb) TO project_admin;

CREATE OR REPLACE FUNCTION public.radar_commit_dated_sync(p_run uuid,p_sales jsonb,p_issues jsonb,p_rows integer,p_catalog jsonb DEFAULT NULL,p_interactions jsonb DEFAULT NULL,p_daily_interactions jsonb DEFAULT NULL)
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
  INSERT INTO public.post_interaction_days AS existing(post_id,fecha,interacciones)
   SELECT x.post_id,x.fecha,x.interacciones FROM jsonb_to_recordset(block->'rows') AS x(post_id text,fecha date,interacciones bigint)
   ON CONFLICT(post_id,fecha) DO UPDATE SET interacciones=EXCLUDED.interacciones
   WHERE existing.interacciones IS DISTINCT FROM EXCLUDED.interacciones;
  INSERT INTO public.post_interaction_coverage AS existing(mes,sin_fecha) VALUES(month_key,(block->>'sin_fecha')::integer)
   ON CONFLICT(mes) DO UPDATE SET sin_fecha=EXCLUDED.sin_fecha,updated_at=now()
   WHERE existing.sin_fecha IS DISTINCT FROM EXCLUDED.sin_fecha;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.radar_commit_dated_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_dated_sync(uuid,jsonb,jsonb,integer,jsonb,jsonb,jsonb) TO project_admin;

-- Exercise the real import functions without leaving a sync run, a write to
-- sales, or an audit event behind. The inner subtransaction always rolls back.
DO $verify$
DECLARE
 sales_input jsonb; issues_input jsonb; monthly_input jsonb; daily_input jsonb;
 sales_before text; issues_before text; monthly_before text; daily_before text;
 run uuid;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY pedido_id),'[]'::jsonb),
  md5(coalesce(string_agg(to_jsonb(s)::text||s.xmin::text,'|' ORDER BY pedido_id),''))
 INTO sales_input,sales_before FROM public.sales_orders s;
 SELECT coalesce(jsonb_agg(jsonb_build_object('pedido_id',pedido_id,'type',tipo,'sheet',source_sheet,'row',source_row,'message',message)),'[]'::jsonb),
  md5(coalesce(string_agg(to_jsonb(q)::text||q.xmin::text,'|' ORDER BY id),''))
 INTO issues_input,issues_before FROM public.data_quality_issues q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('mes',m.mes,'rows',m.rows)),'[]'::jsonb)
 INTO monthly_input FROM (
  SELECT mes,jsonb_agg(jsonb_build_object('post_id',post_id,'interacciones',interacciones)) AS rows
  FROM public.post_interactions GROUP BY mes
 ) m;
 SELECT coalesce(jsonb_agg(jsonb_build_object('mes',c.mes,'sin_fecha',c.sin_fecha,'rows',
  coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM public.post_interaction_days d WHERE to_char(d.fecha,'YYYY-MM')=c.mes),'[]'::jsonb))),'[]'::jsonb)
 INTO daily_input FROM public.post_interaction_coverage c;
 SELECT md5(coalesce(string_agg(to_jsonb(m)::text||m.xmin::text,'|' ORDER BY post_id,mes),''))
 INTO monthly_before FROM public.post_interactions m;
 SELECT md5(coalesce(string_agg(to_jsonb(d)::text||d.xmin::text,'|' ORDER BY post_id,fecha),''))
 INTO daily_before FROM public.post_interaction_days d;
 BEGIN
  run=public.radar_begin_sync(NULL);
  PERFORM public.radar_commit_dated_sync(run,sales_input,issues_input,jsonb_array_length(sales_input),NULL,monthly_input,daily_input);
  IF sales_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(s)::text||s.xmin::text,'|' ORDER BY pedido_id),'')) FROM public.sales_orders s)
   OR issues_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(q)::text||q.xmin::text,'|' ORDER BY id),'')) FROM public.data_quality_issues q)
   OR monthly_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(m)::text||m.xmin::text,'|' ORDER BY post_id,mes),'')) FROM public.post_interactions m)
   OR daily_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(d)::text||d.xmin::text,'|' ORDER BY post_id,fecha),'')) FROM public.post_interaction_days d)
  THEN RAISE EXCEPTION 'Unchanged imports must not rewrite sales, issues or interactions'; END IF;
  RAISE SQLSTATE 'ZX001' USING MESSAGE='Verified unchanged import; rollback rehearsal';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 IF jsonb_array_length(sales_input)>0 THEN
  BEGIN
   run=public.radar_begin_sync(NULL);
   PERFORM public.radar_commit_sync(run,'[]'::jsonb,'[]'::jsonb,0,NULL);
   RAISE EXCEPTION 'Source-row omission guard did not reject an empty load';
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'SOURCE_ROWS_MISSING' THEN RAISE; END IF;
  END;
 END IF;
END $verify$;
