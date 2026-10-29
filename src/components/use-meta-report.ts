'use client';
import {mergeMetaAds,metaCatalogOnly,type MetaAd} from '@/lib/meta-ad-data';
import {useEffect, useRef, useState} from 'react';
import {requestMetaReport, type MetaReport} from '@/lib/meta-report-request';

type State = MetaReport & {key: string; status: string; error: boolean; phase: 'loading' | 'ready' | 'error'};
const ready = (key: string, report: MetaReport): State => ({...report, key, phase: 'ready', error: false, status: report.warning??(report.configured ? 'Datos de Meta del periodo · se actualizan al consultar, con caché de 15 minutos.' : 'Meta todavía no está configurado.')});

export function useMetaReport(range: {from: string; to: string}, enabled: boolean) {
 const key = range.from + '|' + range.to;
 const lastCatalog=useRef<MetaAd[]>([]);
 const cache = useRef(new Map<string, {at: number; report: MetaReport}>());
 const [revision, setRevision] = useState(0);
 const [state, setState] = useState<State>({key: '', configured: false, ads: [], status: '', error: false, phase: 'loading'});
 useEffect(() => {
  if (!enabled) return;
  const controller = new AbortController();
  const entry = cache.current.get(key);
  if (entry && Date.now() - entry.at < 900000) {setState(ready(key, entry.report)); return;}
  setState(current => ({key, configured: entry?.report.configured ?? (current.key === key && current.configured), ads: entry?.report.ads ?? (current.key === key ? current.ads : metaCatalogOnly(lastCatalog.current)), status: 'Consultando Meta…', error: false, phase: 'loading'}));
  requestMetaReport({from: range.from, to: range.to}, controller.signal, () => {
   if (!controller.signal.aborted) setState(current => ({...current, status: 'Meta está tardando. Reintentando automáticamente…'}));
  }).then(report => {
   if (controller.signal.aborted) return;
   if(report.catalogAvailable===false)report={...report,ads:mergeMetaAds(lastCatalog.current,report.ads)};
   lastCatalog.current=metaCatalogOnly(report.ads);
   cache.current.delete(key);
   cache.current.set(key, {at: Date.now(), report});
   if (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value!);
   setState(ready(key, report));
  }).catch(error => {
   if (!controller.signal.aborted) setState(current => ({...current, key, phase: 'error', error: true, status: error instanceof Error ? error.message : 'No pudimos consultar Meta.'}));
  });
  return () => controller.abort();
 }, [enabled, key, range.from, range.to, revision]);
 const current: State = state.key === key ? state : {key, configured: false, ads: [], status: 'Consultando Meta…', error: false, phase: 'loading'};
 return {...current, reload: () => {cache.current.delete(key); setRevision(value => value + 1);}};
}
