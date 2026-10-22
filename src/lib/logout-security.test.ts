import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AppError} from './errors';
const mock=vi.hoisted(()=>({origin:vi.fn(),protect:vi.fn(),clear:vi.fn(),signOut:vi.fn(),jar:{}}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>mock.jar}));
vi.mock('@/lib/security',()=>({protectRequest:mock.protect}));
vi.mock('@/lib/server',()=>({sameOrigin:mock.origin,failure:(e:AppError)=>Response.json({error:e.message},{status:e.status??500})}));
vi.mock('@/lib/session-idle-server',()=>({clearSessionCookies:mock.clear}));
vi.mock('@insforge/sdk/ssr',()=>({createAuthActions:()=>({signOut:mock.signOut})}));
vi.mock('@/lib/backend-fetch',async()=>await import('./backend-fetch'));
vi.mock('@/lib/auth-cookie-settings',async()=>await import('./auth-cookie-settings'));
import {POST} from '../app/api/auth/sign-out/route';
beforeEach(()=>{vi.clearAllMocks();mock.origin.mockReset();mock.protect.mockReset();mock.signOut.mockReset()});
describe('reliable, same-origin logout',()=>{
 it('always clears local credentials when the limiter or upstream is unavailable',async()=>{
  mock.protect.mockRejectedValueOnce(new AppError('Unavailable',503));
  expect((await POST(new Request('http://localhost/api/auth/sign-out',{method:'POST'}))).status).toBe(200);
  expect(mock.clear).toHaveBeenCalledWith(mock.jar);expect(mock.signOut).not.toHaveBeenCalled();
  mock.clear.mockClear();mock.signOut.mockRejectedValueOnce(new Error('Offline'));
  const response=await POST(new Request('http://localhost/api/auth/sign-out',{method:'POST'}));
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(mock.clear).toHaveBeenCalledWith(mock.jar);
 });
 it('does not allow another website to clear the session',async()=>{
  mock.origin.mockImplementationOnce(()=>{throw new AppError('Forbidden',403)});
  expect((await POST(new Request('http://localhost/api/auth/sign-out',{method:'POST'}))).status).toBe(403);
  expect(mock.clear).not.toHaveBeenCalled();expect(mock.signOut).not.toHaveBeenCalled();
 });
});
