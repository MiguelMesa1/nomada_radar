-- Optional product description for unclassified sales without a Post ID.
-- Legacy seven-column pushes preserve any summary already received.
SET LOCAL lock_timeout='5s';
ALTER TABLE public.sales_orders ADD COLUMN resumen_pedido text CHECK (resumen_pedido IS NULL OR char_length(resumen_pedido)<=1500);
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

 INSERT INTO public.sales_orders AS existing(pedido_id,fecha_venta,post_id,ciudad_original,ciudad_normalizada,departamento,importe_cop,estado,linea,resumen_pedido)
 SELECT x.pedido_id,x.fecha_venta,x.post_id,x.ciudad_original,x.ciudad_normalizada,x.departamento,x.importe_cop,x.estado,x.linea,x.resumen_pedido FROM jsonb_to_recordset(p_sales) AS x(pedido_id text,fecha_venta timestamptz,post_id text,ciudad_original text,ciudad_normalizada text,departamento text,importe_cop bigint,estado text,linea text,resumen_pedido text)
 ON CONFLICT(pedido_id) DO UPDATE SET fecha_venta=EXCLUDED.fecha_venta,post_id=EXCLUDED.post_id,ciudad_original=EXCLUDED.ciudad_original,ciudad_normalizada=EXCLUDED.ciudad_normalizada,departamento=EXCLUDED.departamento,importe_cop=EXCLUDED.importe_cop,estado=EXCLUDED.estado,linea=EXCLUDED.linea,resumen_pedido=COALESCE(EXCLUDED.resumen_pedido,existing.resumen_pedido),ingested_at=now()
 WHERE (existing.fecha_venta,existing.post_id,existing.ciudad_original,existing.ciudad_normalizada,existing.departamento,existing.importe_cop,existing.estado,existing.linea,existing.resumen_pedido)
 IS DISTINCT FROM (EXCLUDED.fecha_venta,EXCLUDED.post_id,EXCLUDED.ciudad_original,EXCLUDED.ciudad_normalizada,EXCLUDED.departamento,EXCLUDED.importe_cop,EXCLUDED.estado,EXCLUDED.linea,COALESCE(EXCLUDED.resumen_pedido,existing.resumen_pedido));
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

REVOKE ALL ON FUNCTION public.radar_commit_sync(uuid,jsonb,jsonb,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_commit_sync(uuid,jsonb,jsonb,integer,uuid) TO project_admin;
