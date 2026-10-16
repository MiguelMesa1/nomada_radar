CREATE TABLE public.radar_rate_buckets (
 bucket_key text NOT NULL CHECK(bucket_key ~ '^[0-9a-f]{64}$'),
 window_start timestamptz NOT NULL,
 hits integer NOT NULL CHECK(hits>0),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(bucket_key,window_start)
);
CREATE INDEX radar_rate_expiry_idx ON public.radar_rate_buckets(expires_at);
ALTER TABLE public.radar_rate_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.radar_rate_buckets FROM PUBLIC,anon,authenticated;

-- One transaction serializes each bucket across all app instances. Hashes do
-- not reveal client IPs/emails; blocked calls never prolong the window.
CREATE FUNCTION public.radar_consume_limits(p_limits jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE item jsonb; k text; cap integer; seconds integer; start_at timestamptz;
 current_hits integer; allowed boolean:=true; retry integer:=0;
BEGIN
 IF jsonb_typeof(p_limits)<>'array' OR jsonb_array_length(p_limits) NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'Invalid limits'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_limits) ORDER BY value->>'key' LOOP
  k:=item->>'key';cap:=(item->>'limit')::integer;seconds:=(item->>'seconds')::integer;
  IF k IS NULL OR k !~ '^[0-9a-f]{64}$' OR cap IS NULL OR cap NOT BETWEEN 1 AND 1000 OR seconds IS NULL OR seconds NOT BETWEEN 1 AND 3600 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  start_at:=to_timestamp(floor(extract(epoch FROM now())/seconds)*seconds);
  INSERT INTO public.radar_rate_buckets(bucket_key,window_start,hits,expires_at)
  VALUES(k,start_at,1,start_at+make_interval(secs=>seconds))
  ON CONFLICT(bucket_key,window_start) DO UPDATE SET hits=least(radar_rate_buckets.hits+1,cap+1)
  RETURNING hits INTO current_hits;
  IF current_hits>cap THEN allowed:=false;retry:=greatest(retry,ceil(extract(epoch FROM start_at+make_interval(secs=>seconds)-now()))::integer); END IF;
 END LOOP;
 DELETE FROM public.radar_rate_buckets WHERE (bucket_key,window_start) IN
  (SELECT bucket_key,window_start FROM public.radar_rate_buckets WHERE expires_at<now() ORDER BY expires_at LIMIT 100);
 RETURN jsonb_build_object('allowed',allowed,'retry_after',greatest(1,retry));
END $$;
REVOKE ALL ON FUNCTION public.radar_consume_limits(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.radar_consume_limits(jsonb) TO project_admin;

-- Direct SDK writes by authorized accounts cannot bypass the write budget.
CREATE FUNCTION public.radar_guard_write_rate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE outcome jsonb;
BEGIN
 IF auth.uid() IS NOT NULL THEN
  outcome:=public.radar_consume_limits(jsonb_build_array(jsonb_build_object(
   'key',encode(sha256(convert_to('direct-write:'||auth.uid()::text,'UTF8')),'hex'),
   'limit',30,'seconds',60)));
  IF NOT (outcome->>'allowed')::boolean THEN RAISE EXCEPTION 'Write limit exceeded' USING ERRCODE='P0001'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.radar_guard_write_rate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER catalog_write_rate BEFORE INSERT OR UPDATE ON public.post_catalog FOR EACH ROW EXECUTE FUNCTION public.radar_guard_write_rate();
CREATE TRIGGER aliases_write_rate BEFORE INSERT OR UPDATE ON public.city_aliases FOR EACH ROW EXECUTE FUNCTION public.radar_guard_write_rate();
