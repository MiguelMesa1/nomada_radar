import {beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({load:vi.fn(),auth:vi.fn()}));
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}));
vi.mock('@/lib/meta-ads-cache',()=>({cachedMetaReport:mock.load}));
vi.mock('@/lib/security',()=>({protectRequest:vi.fn(),protectUser:vi.fn()}));
vi.mock('@/lib/server',async()=>{const {AppError}=await import('./errors');return {requireProfile:mock.auth,parseRange:()=>({from:'2026-10-01',to:'2026-10-23'}),failure:(e:InstanceType<typeof AppError>)=>Response.json({error:e.message},{status:e.status})}});
import {GET} from '../app/api/meta/route';
import {AppError} from './errors';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('META_ACCESS_TOKEN','private-token');vi.stubEnv('META_AD_ACCOUNT_ID','123');mock.auth.mockResolvedValue({profile:{user_id:'reader'}});mock.load.mockResolvedValue({ads:[{id:'A',frequency:1.25}],catalogAvailable:true})});
describe('authorized Meta reports',()=>{
 it('loads the configured account only after authentication and never returns credentials',async()=>{
  const result=await GET(new Request('https://radar.test/api/meta?account=evil'));expect(result.status).toBe(200);expect(mock.load).toHaveBeenCalledWith('123','2026-10-01','2026-10-23');expect(await result.json()).toEqual({configured:true,ads:[{id:'A',frequency:1.25}],catalogAvailable:true});
 });
 it('requires a session before querying Meta and handles unconfigured installations',async()=>{
  mock.auth.mockRejectedValueOnce(new AppError('Inicia sesión',401));expect((await GET(new Request('https://radar.test/api/meta'))).status).toBe(401);expect(mock.load).not.toHaveBeenCalled();
  vi.stubEnv('META_ACCESS_TOKEN','');expect(await (await GET(new Request('https://radar.test/api/meta'))).json()).toEqual({configured:false,ads:[]});expect(mock.load).not.toHaveBeenCalled();
 });
});
