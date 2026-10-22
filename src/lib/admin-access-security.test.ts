import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AppError} from './errors';
const mock=vi.hoisted(()=>({auth:vi.fn(),protect:vi.fn(),rpc:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/security',()=>({protectRequest:mock.protect,protectUser:vi.fn()}));
vi.mock('@/lib/server',async()=>{const {AppError}=await import('./errors');return {AppError,requireProfile:mock.auth,adminClient:()=>({database:{rpc:mock.rpc}}),failure:(e:InstanceType<typeof AppError>)=>Response.json({error:e.message},{status:e.status??500})}});
vi.mock('@/lib/http-security',async()=>await import('./http-security'));
import {PATCH} from '../app/api/admin/route';
const actor='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';
const request=(body:unknown)=>new Request('http://localhost/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mock.auth.mockReset().mockResolvedValue({profile:{user_id:actor}});mock.rpc.mockReset().mockResolvedValue({error:null})});
describe('accountable access changes',()=>{
 it('binds the audit actor to the authenticated principal and uses the atomic operation',async()=>{
  expect((await PATCH(request({user_id:target,role:'analista',p_actor:target}))).status).toBe(200);
  expect(mock.auth).toHaveBeenCalledWith(['principal']);
  expect(mock.rpc).toHaveBeenCalledWith('radar_update_access',{p_actor:actor,p_user:target,p_role:'analista',p_active:null});
 });
 it('rejects unauthorized and self permission changes, and hides internal errors',async()=>{
  mock.auth.mockRejectedValueOnce(new AppError('Forbidden',403));expect((await PATCH(request({user_id:target,activo:false}))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();
  expect((await PATCH(request({user_id:actor,activo:false}))).status).toBe(400);expect(mock.rpc).not.toHaveBeenCalled();
  mock.rpc.mockResolvedValueOnce({error:{message:'private database detail'}});const result=await PATCH(request({user_id:target,activo:false}));expect(result.status).toBe(409);expect(await result.text()).not.toContain('private database detail');
 });
});
