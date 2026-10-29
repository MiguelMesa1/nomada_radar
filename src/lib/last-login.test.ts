import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({signIn:vi.fn(),signOut:vi.fn(),single:vi.fn(),rpc:vi.fn(),touch:vi.fn(),requireProfile:vi.fn(),from:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({})}));
vi.mock('@/lib/backend-fetch',()=>({backendFetch:vi.fn()}));
vi.mock('@/lib/auth-cookie-settings',()=>({authCookieSettings:{}}));
vi.mock('@/lib/http-security',async()=>await import('./http-security'));
vi.mock('@/lib/security',()=>({protectRequest:vi.fn(),protectAccount:vi.fn(),protectUser:vi.fn()}));
vi.mock('@/lib/session-idle-server',()=>({touchIdleSession:mock.touch}));
vi.mock('@insforge/sdk/ssr',()=>({createAuthActions:()=>({signInWithPassword:mock.signIn,signOut:mock.signOut}),createServerClient:()=>({database:{from:()=>({select:()=>({eq:()=>({single:mock.single})})})}})}));
vi.mock('@/lib/server',async()=>{const {AppError}=await import('./errors');return {AppError,requireProfile:mock.requireProfile,adminClient:()=>({database:{rpc:mock.rpc}}),failure:(e:InstanceType<typeof AppError>)=>Response.json({error:e.message},{status:e.status??500})}});
import {POST} from '../app/api/auth/sign-in/route';
import {GET} from '../app/api/admin/route';
const request=()=>new Request('http://localhost/api/auth/sign-in',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'qa@example.com',password:'test-password'})});
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY','test');
 mock.signIn.mockResolvedValue({data:{user:{id:'user'}},error:null});
 mock.single.mockResolvedValue({data:{activo:true},error:null});
 mock.rpc.mockResolvedValue({error:null});
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()});
describe('last successful login',()=>{
 it('records only the authenticated user after granting the session',async()=>{
  expect((await POST(request())).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('radar_record_login',{p_user:'user'});
  expect(mock.touch.mock.invocationCallOrder[0]).toBeLessThan(mock.rpc.mock.invocationCallOrder[0]);
 });
 it('does not record failed credentials or suspended accounts',async()=>{
  mock.signIn.mockResolvedValueOnce({error:{message:'Invalid'}});
  expect((await POST(request())).status).toBe(401);
  mock.single.mockResolvedValueOnce({data:{activo:false}});
  expect((await POST(request())).status).toBe(403);
  expect(mock.rpc).not.toHaveBeenCalled();expect(mock.touch).not.toHaveBeenCalled();
 });
 it('keeps login available if recording is temporarily unavailable',async()=>{
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  mock.rpc.mockRejectedValueOnce(new Error('private detail'));
  expect((await POST(request())).status).toBe(200);
 });
 it('merges dates into principal-only administration and preserves unknown dates',async()=>{
  const users=[{user_id:'user',nombre:'Admin'},{user_id:'new',nombre:'Nuevo'}];
  mock.from.mockImplementation((table:string)=>({select:()=>table==='user_profiles'?{order:()=>({limit:async()=>({data:users})})}:{limit:async()=>({data:[{user_id:'user',last_login_at:'2026-10-28T17:00:00Z'}]})}}));
  mock.requireProfile.mockResolvedValue({profile:{user_id:'user'},client:{database:{from:mock.from}}});
  const response=await GET(new Request('http://localhost/api/admin'));
  expect(response.status).toBe(200);expect(mock.requireProfile).toHaveBeenCalledWith(['principal']);
  expect((await response.json()).users).toEqual([{...users[0],last_login_at:'2026-10-28T17:00:00Z'},{...users[1],last_login_at:null}]);
 });
});
