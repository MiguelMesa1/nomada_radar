CREATE TABLE public.sale_line_overrides (
 pedido_id text NOT NULL CHECK(length(pedido_id) BETWEEN 1 AND 500),
 fecha_venta timestamptz NOT NULL,
 linea text NOT NULL CHECK(length(trim(linea)) BETWEEN 1 AND 120 AND lower(trim(linea)) NOT IN ('sin línea','sin linea')),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(pedido_id,fecha_venta)
);
CREATE INDEX sale_line_overrides_date_idx ON public.sale_line_overrides(fecha_venta);
ALTER TABLE public.sale_line_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sale_line_overrides FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.sale_line_overrides TO authenticated;
CREATE POLICY sale_line_overrides_read ON public.sale_line_overrides FOR SELECT TO authenticated
 USING(public.radar_role() IS NOT NULL);
CREATE POLICY sale_line_overrides_insert ON public.sale_line_overrides FOR INSERT TO authenticated
 WITH CHECK(public.radar_role() IN ('principal','analista') AND updated_by=auth.uid() AND EXISTS (
  SELECT 1 FROM public.sales_orders s WHERE s.pedido_id=sale_line_overrides.pedido_id
   AND s.fecha_venta=sale_line_overrides.fecha_venta AND coalesce(s.post_id,'')=''
 ));
CREATE POLICY sale_line_overrides_update ON public.sale_line_overrides FOR UPDATE TO authenticated
 USING(public.radar_role() IN ('principal','analista'))
 WITH CHECK(public.radar_role() IN ('principal','analista') AND updated_by=auth.uid() AND EXISTS (
  SELECT 1 FROM public.sales_orders s WHERE s.pedido_id=sale_line_overrides.pedido_id
   AND s.fecha_venta=sale_line_overrides.fecha_venta AND coalesce(s.post_id,'')=''
 ));
