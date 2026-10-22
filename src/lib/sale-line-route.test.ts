import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mock=vi.hoisted(()=>({auth:vi.fn(),protect:vi.fn(),upsert:vi.fn(),single:vi.fn()}));
vi.mock('@/lib/security',()=>({protectRequest:mock.protect,protectUser:vi.fn()}));
vi.mock('@/lib/server',async()=>{
 const {AppError}=await import('./errors');
 return {AppError,requireProfile:mock.auth,failure:(e:InstanceType<typeof AppError>)=>Response.json({error:e.message},{status:e.status??500})};
});
vi.mock('@/lib/http-security',()=>({readJSON:(request:Request)=>request.json()}));
vi.mock('@/lib/classification',async()=>await import('./classification'));
import {POST} from '../app/api/sales/line/route';
import {AppError} from './errors';
const input={pedido_id:'row-1046',fecha_venta:'2026-10-14T17:00:00Z',linea:'NS'};
const request=()=>new Request('https://radar.test/api/sales/line',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,updated_by:'forged'})});
beforeEach(()=>{
 vi.clearAllMocks();
 const query:any={select:()=>query,eq:()=>query,single:mock.single};
 mock.auth.mockResolvedValue({profile:{user_id:'actor'},client:{database:{from:(table:string)=>table==='sales_orders'?query:{upsert:mock.upsert}}}});
 mock.single.mockResolvedValue({data:{pedido_id:input.pedido_id,post_id:''}});mock.upsert.mockResolvedValue({error:null});
});
describe('sales line endpoint',()=>{
 it('validates the row, canonicalizes the line and uses the authenticated actor',async()=>{
  expect((await POST(request())).status).toBe(200);
  expect(mock.auth).toHaveBeenCalledWith(['principal','analista']);
  expect(mock.upsert).toHaveBeenCalledWith([expect.objectContaining({...input,linea:'NS 200',updated_by:'actor'})],{onConflict:'pedido_id,fecha_venta'});
 });
 it('rejects rows that now have a Post ID or no longer exist',async()=>{
  mock.single.mockResolvedValueOnce({data:{post_id:'A'}});expect((await POST(request())).status).toBe(409);
  mock.single.mockResolvedValueOnce({data:null,error:{}});expect((await POST(request())).status).toBe(409);
  expect(mock.upsert).not.toHaveBeenCalled();
 });
 it('blocks read-only accounts and reports a failed save without claiming success',async()=>{
  mock.auth.mockRejectedValueOnce(new AppError('Sin permiso',403));expect((await POST(request())).status).toBe(403);expect(mock.upsert).not.toHaveBeenCalled();
  mock.upsert.mockResolvedValueOnce({error:{message:'private detail'}});const result=await POST(request());expect(result.status).toBe(503);expect(await result.text()).not.toContain('private detail');
 });
});
