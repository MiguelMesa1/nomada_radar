import {afterEach,describe,expect,it,vi} from 'vitest';
import {requestJSON} from './client-request';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
describe('Client requests',()=>{
 it('does not display hosting HTML errors or cache a private response',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('<html>private diagnostic</html>',{status:502}));
  vi.stubGlobal('fetch',fetcher);
  await expect(requestJSON('/api/catalog')).rejects.toThrow('El servidor no respondió correctamente');
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store'});
 });
 it('keeps controlled API errors and accepts successful results',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({error:'Espera antes de actualizar.'},{status:429})).mockResolvedValueOnce(Response.json({ok:true})));
  await expect(requestJSON('/api/sync')).rejects.toThrow('Espera antes de actualizar.');
  await expect(requestJSON('/api/catalog')).resolves.toEqual({ok:true});
 });
 it('stops stalled requests instead of leaving the form busy',async()=>{
  const deadline=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);
  vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason)))));
  const result=requestJSON('/api/sync',{method:'POST'},120000);
  deadline.abort(new DOMException('Timed out','TimeoutError'));
  await expect(result).rejects.toThrow('Recarga el informe para comprobar el resultado');
 });
 it('honors caller cancellation without retrying mutations',async()=>{
  const caller=new AbortController();caller.abort();const fetcher=vi.fn().mockImplementation((_url,init)=>{init.signal.throwIfAborted()});vi.stubGlobal('fetch',fetcher);
  await expect(requestJSON('/api/catalog',{method:'POST',signal:caller.signal})).rejects.toMatchObject({name:'AbortError'});
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
