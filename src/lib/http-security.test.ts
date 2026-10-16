import {describe,it,expect,vi,afterEach} from 'vitest';
import {BurstLimiter,readJSON,validateRequestSize} from './http-security';
import {isSameOrigin} from './request-origin';
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers()});
const request=(body:string,headers:Record<string,string>={})=>new Request('http://127.0.0.1:3000/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
describe('Bounded JSON requests',()=>{
 it('accepts small valid JSON and rejects malformed JSON and wrong content types',async()=>{
  expect(await readJSON(request('{"post_id":"A"}'))).toEqual({post_id:'A'});
  await expect(readJSON(request('{'))).rejects.toMatchObject({status:400});
  await expect(readJSON(request('{}',{'Content-Type':'text/plain'}))).rejects.toMatchObject({status:415});
 });
 it('checks content length before reading and limits streamed bytes without trusting that header',async()=>{
  expect(()=>validateRequestSize(request('{}',{'Content-Length':'999999999'}))).toThrow();
  await expect(readJSON(request(JSON.stringify({x:'a'.repeat(20000)})))).rejects.toMatchObject({status:413});
  await expect(readJSON(request(JSON.stringify({x:'a'.repeat(20000)}),{'Content-Length':'2'}))).rejects.toMatchObject({status:413});
 });
 it('rejects compressed payloads and missing bodies',async()=>{
  expect(()=>validateRequestSize(request('{}',{'Content-Encoding':'gzip'}))).toThrow();
  await expect(readJSON(new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'}}))).rejects.toMatchObject({status:400});
 });
 it('bounds a stalled stream and cancels the reader',async()=>{
  vi.useFakeTimers();const cancel=vi.fn();const stream=new ReadableStream({start(){},cancel});
  const r=new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'} as RequestInit);
  const result=readJSON(r);const assertion=expect(result).rejects.toMatchObject({status:408});
  await vi.advanceTimersByTimeAsync(5001);await assertion;expect(cancel).toHaveBeenCalled();
 });
});
describe('Burst fuse',()=>{
 it('blocks excess calls, expires naturally and does not extend blocking on denied calls',()=>{
  const limit=new BurstLimiter();expect(limit.consume('a',2,60,0).allowed).toBe(true);expect(limit.consume('a',2,60,1).allowed).toBe(true);
  expect(limit.consume('a',2,60,30000)).toEqual({allowed:false,retryAfter:30});
  expect(limit.consume('a',2,60,59000)).toEqual({allowed:false,retryAfter:1});
  expect(limit.consume('a',2,60,60000).allowed).toBe(true);
 });
 it('bounds memory and prevents key churn from evicting an active ban',()=>{
  const limit=new BurstLimiter(1);limit.consume('a',1,60,0);
  expect(limit.consume('b',1,60,1).allowed).toBe(false);expect(limit.consume('a',1,60,2).allowed).toBe(false);
  expect(limit.consume('b',1,60,60001).allowed).toBe(true);
 });
});
describe('Canonical-origin CSRF validation',()=>{
 it('does not trust forged Host or forwarded headers for non-local requests',()=>{
  expect(isSameOrigin(new Request('https://app.example/api/catalog',{headers:{host:'evil.example',origin:'https://evil.example','x-forwarded-host':'evil.example'}}))).toBe(false);
 });
 it('requires the configured origin and rejects browser cross-site requests',()=>{
  vi.stubEnv('RADAR_APP_ORIGIN','https://radar.example');
  expect(isSameOrigin(new Request('http://internal/api/catalog',{headers:{origin:'https://radar.example'}}))).toBe(true);
  expect(isSameOrigin(new Request('http://internal/api/catalog',{headers:{origin:'https://evil.example'}}))).toBe(false);
  expect(isSameOrigin(new Request('http://internal/api/catalog',{headers:{origin:'https://radar.example','sec-fetch-site':'cross-site'}}))).toBe(false);
 });
});
