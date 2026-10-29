import type {MetaAd} from './meta-ad-data';

export type MetaReport = {configured: boolean; ads: MetaAd[];catalogAvailable?:boolean;warning?:string};

class MetaReportError extends Error {
 constructor(message: string, readonly retryable: boolean) {super(message);}
}

function pause(ms: number, signal: AbortSignal) {
 return new Promise<void>((resolve, reject) => {
  signal.throwIfAborted();
  const abort = () => {clearTimeout(timer); reject(signal.reason);};
  const timer = setTimeout(() => {signal.removeEventListener('abort', abort); resolve();}, ms);
  signal.addEventListener('abort', abort, {once: true});
 });
}

export async function requestMetaReport(range: {from: string; to: string}, signal: AbortSignal, onRetry: () => void): Promise<MetaReport> {
 for (let attempt = 0; attempt < 3; attempt++) {
  signal.throwIfAborted();
  try {
   const response = await fetch('/api/meta?' + new URLSearchParams(range), {signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]), cache: 'no-store'});
   let data;
   try {data = await response.json();} catch {throw new MetaReportError('Meta no respondió correctamente. Puedes volver a consultar.', response.status >= 500);}
   if (!response.ok) throw new MetaReportError(typeof data?.error === 'string' ? data.error : 'No pudimos consultar Meta.', [408, 500, 502, 503, 504].includes(response.status));
   if (!Array.isArray(data?.ads) || typeof data.configured !== 'boolean') throw new MetaReportError('Meta devolvió una respuesta incompleta.', true);
   signal.throwIfAborted();
   return data as MetaReport;
  } catch (error) {
   if (signal.aborted) throw signal.reason;
   if (attempt === 2 || (error instanceof MetaReportError && !error.retryable)) throw error;
   onRetry();
   await pause(attempt === 0 ? 1000 : 3000, signal);
  }
 }
 throw new Error('No pudimos consultar Meta.');
}
