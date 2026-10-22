CREATE TABLE public.line_catalog (
 nombre text NOT NULL CHECK(length(trim(nombre)) BETWEEN 1 AND 120),
 clave text GENERATED ALWAYS AS (lower(translate(regexp_replace(trim(nombre),'\s+',' ','g'),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun'))) STORED PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.line_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.line_catalog FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT(nombre) ON public.line_catalog TO authenticated;
CREATE POLICY line_catalog_read ON public.line_catalog FOR SELECT TO authenticated
 USING(public.radar_role() IS NOT NULL);
CREATE POLICY line_catalog_insert ON public.line_catalog FOR INSERT TO authenticated
 WITH CHECK(public.radar_role() IN ('principal','analista') AND clave NOT IN ('sin linea',''));
INSERT INTO public.line_catalog(nombre) VALUES
 ('XTZ 125'),('XTZ 150'),('Pulsar 180'),('Superlander'),('Boxer CT 100'),('NS 200'),('Cúpula'),('Accesorios');
