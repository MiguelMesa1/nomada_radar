import {beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({auth:vi.fn(),write:vi.fn(),single:vi.fn(),lookup:vi.fn()}));
vi.mock('@/lib/security',()=>({protectRequest:vi.fn(),protectUser:vi.fn()}));
vi.mock('@/lib/http-security',()=>({readJSON:(request:Request)=>request.json()}));
vi.mock('@/lib/publication-link',async()=>await import('./publication-link'));
vi.mock('@/lib/catalog-duplicate',async()=>await import('./catalog-duplicate'));
vi.mock('@/lib/server',async()=>{
 const {AppError}=await import('./errors');
 return {AppError,requireProfile:mock.auth,failure:(error:InstanceType<typeof AppError>)=>Response.json({error:error.message},{status:error.status})};
});
import {POST,PATCH} from '../app/api/catalog/route';
import {AppError} from './errors';
const input={post_id:'A',nombre_creativo:'Video',campana:'',producto:'NS 200',plataforma:'Facebook',activo:true,fecha_inicio:'2026-10-20'};
const request=(fields:object)=>new Request('https://radar.test/api/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,...fields})});
beforeEach(()=>{
 vi.clearAllMocks();
 const query={eq:()=>query,select:()=>query,single:mock.single};
 const read={eq:()=>read,maybeSingle:mock.lookup};
 mock.write.mockReturnValue(query);mock.single.mockResolvedValue({error:null});
 mock.lookup.mockResolvedValue({data:null});
 mock.auth.mockResolvedValue({profile:{user_id:'actor'},client:{database:{from:()=>({insert:mock.write,update:mock.write,select:()=>read})}}});
});
describe('optional publication URL persistence',()=>{
 it('rejects duplicate IDs with their saved line, including a concurrent insertion and differently cased input',async()=>{
  mock.single.mockResolvedValueOnce({error:{code:'23505'}});
  mock.lookup.mockResolvedValueOnce({data:{post_id:'A',producto:'Pulsar'}});
  const response=await POST(request({post_id:' a ',producto:'XTZ 125'}));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({error:'El Post ID A ya se encuentra en el catálogo y está asignado a la línea Pulsar 180.'});
  expect(mock.write).toHaveBeenCalledTimes(1);
  expect(mock.write).toHaveBeenCalledWith([expect.objectContaining({post_id:'A'})]);
 });
 it('also rejects a duplicate that has no assigned line, and never guesses the line when lookup fails',async()=>{
  mock.single.mockResolvedValue({error:{code:'23505'}});
  mock.lookup.mockResolvedValueOnce({data:{post_id:'A',producto:''}});
  expect(await (await POST(request({}))).json()).toEqual({error:'El Post ID A ya se encuentra en el catálogo y todavía no tiene una línea asignada.'});
  mock.lookup.mockResolvedValueOnce({data:null,error:{}});
  const response=await POST(request({producto:'NS 200'}));
  expect(response.status).toBe(409);expect((await response.json()).error).not.toContain('NS 200');
 });
 it('creates with a trimmed link and explicitly clears one on edit',async()=>{
  expect((await POST(request({publicacion_url:' https://www.instagram.com/p/abc/ '}))).status).toBe(200);
  expect(mock.write).toHaveBeenLastCalledWith([expect.objectContaining({publicacion_url:'https://www.instagram.com/p/abc/'})]);
  expect((await PATCH(request({publicacion_url:''}))).status).toBe(200);
  expect(mock.write).toHaveBeenLastCalledWith(expect.objectContaining({publicacion_url:null}));
 });
 it('accepts older payloads without clearing a link and rejects unsafe links',async()=>{
  expect((await PATCH(request({activo:false}))).status).toBe(200);
  expect(mock.write.mock.calls[0][0]).not.toHaveProperty('publicacion_url');
  mock.write.mockClear();
  for(const publicacion_url of ['javascript:alert(1)','https://instagram.com.evil.test/','https://example.com/'])expect((await POST(request({publicacion_url}))).status).toBe(400);
  expect(mock.write).not.toHaveBeenCalled();
 });
 it('preserves editor-only access',async()=>{
  mock.auth.mockRejectedValueOnce(new AppError('Sin permiso',403));
  expect((await PATCH(request({publicacion_url:null}))).status).toBe(403);
  expect(mock.auth).toHaveBeenCalledWith(['principal','analista']);
  expect(mock.write).not.toHaveBeenCalled();
 });
});
