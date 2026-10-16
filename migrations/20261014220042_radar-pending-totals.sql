-- A historical blank is unknown, distinct from a confirmed zero-COP sale.
ALTER TABLE public.sales_orders ALTER COLUMN importe_cop DROP NOT NULL;
COMMENT ON COLUMN public.sales_orders.importe_cop IS 'COP total; NULL means pending. Zero is a known amount. Orders still count when NULL.';
