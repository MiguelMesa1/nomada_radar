import {afterEach, describe, expect, it, vi} from 'vitest';
import {requestMetaReport} from './meta-report-request';
const range={from:'2026-10-23',to:'2026-10-23'};
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('Meta report recovery',()=>{
 it('retries temporary failures and keeps the requested day',async()=>{
  vi.useFakeTimers();
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({error:'Meta temporalmente ocupado'},{status:502})).mockResolvedValueOnce(Response.json({configured:true,ads:[{id:'A',frequency:1.5}]}));
  vi.stubGlobal('fetch',fetcher);const retry=vi.fn();
  const result=requestMetaReport(range,new AbortController().signal,retry);
  await vi.runAllTimersAsync();expect((await result).ads[0].frequency).toBe(1.5);expect(retry).toHaveBeenCalledOnce();expect(fetcher).toHaveBeenCalledTimes(2);
  for(const [url,options] of fetcher.mock.calls){expect(url).toBe('/api/meta?from=2026-10-23&to=2026-10-23');expect(options.cache).toBe('no-store');}
 });
 it('does not retry login, permission or rate-limit errors',async()=>{
  for(const status of [401,403,429]){
   const fetcher=vi.fn().mockResolvedValue(Response.json({error:'Solicitud rechazada'},{status}));vi.stubGlobal('fetch',fetcher);
   await expect(requestMetaReport(range,new AbortController().signal,vi.fn())).rejects.toThrow('Solicitud rechazada');expect(fetcher).toHaveBeenCalledOnce();
  }
 });
 it('cancels a pending retry immediately when the day changes',async()=>{
  vi.useFakeTimers();const controller=new AbortController();
  const fetcher=vi.fn().mockResolvedValue(Response.json({error:'Error temporal'},{status:503}));vi.stubGlobal('fetch',fetcher);
  const result=requestMetaReport(range,controller.signal,()=>queueMicrotask(()=>controller.abort()));
  const rejected=expect(result).rejects.toThrow();await vi.runAllTimersAsync();await rejected;expect(fetcher).toHaveBeenCalledOnce();
 });
 it('stops after three attempts instead of retrying indefinitely',async()=>{
  vi.useFakeTimers();const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(Response.json({error:'Error temporal'},{status:502})));vi.stubGlobal('fetch',fetcher);
  const result=requestMetaReport(range,new AbortController().signal,vi.fn());const rejected=expect(result).rejects.toThrow('Error temporal');
  await vi.runAllTimersAsync();await rejected;expect(fetcher).toHaveBeenCalledTimes(3);
 });
 it('does not turn a legitimately empty day into an error',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({configured:true,ads:[]}));vi.stubGlobal('fetch',fetcher);
  expect(await requestMetaReport(range,new AbortController().signal,vi.fn())).toEqual({configured:true,ads:[]});expect(fetcher).toHaveBeenCalledOnce();
 });
});
