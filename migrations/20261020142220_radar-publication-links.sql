ALTER TABLE public.post_catalog
 ADD COLUMN publicacion_url text
 CHECK (publicacion_url IS NULL OR (length(publicacion_url) BETWEEN 1 AND 2048 AND publicacion_url ~ '^https://'));

GRANT INSERT(publicacion_url),UPDATE(publicacion_url) ON public.post_catalog TO authenticated;
COMMENT ON COLUMN public.post_catalog.publicacion_url IS 'Optional social publication URL, maintained in Radar and preserved by Sheets synchronization.';
