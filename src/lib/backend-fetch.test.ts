import {it,expect,vi,afterEach} from 'vitest';
import {backendFetch} from './backend-fetch';
afterEach(()=>vi.unstubAllGlobals());
it('preserves cancellation while adding a finite upstream deadline',async()=>{
 const mock=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',mock);
 const abort=new AbortController();await backendFetch('https://backend.example',{signal:abort.signal});
 const combined=mock.mock.calls[0][1].signal;expect(combined.aborted).toBe(false);abort.abort();expect(combined.aborted).toBe(true);
});
it('still sends a cancellation signal when the caller has none',async()=>{
 const mock=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',mock);
 await backendFetch('https://backend.example');expect(mock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});
