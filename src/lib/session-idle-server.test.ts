import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),updateSession:vi.fn(),createServerClient:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:mocks.get,set:mocks.set})}));
vi.mock('@insforge/sdk/ssr/middleware',()=>({updateSession:mocks.updateSession}));
vi.mock('@insforge/sdk/ssr',()=>({createServerClient:mocks.createServerClient}));
import {decodeIdleSession,encodeIdleSession,requireIdleSession,touchIdleSession,IDLE_COOKIE} from './session-idle-server';
import {IDLE_TIMEOUT_MS} from './idle-session';
import {requireProfile} from './server';
const now=Date.parse('2026-10-19T12:00:00Z');
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('INSFORGE_API_KEY','test-only-secret');vi.stubEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY','test-anon');vi.useFakeTimers();vi.setSystemTime(now)});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs()});
describe('idle session expiry',()=>{
 it('expires at exactly one hour and rejects missing, modified or future sessions',()=>{
  const cookie=encodeIdleSession('user',now);
  expect(decodeIdleSession(cookie,now+IDLE_TIMEOUT_MS-1)).toEqual({userId:'user',expiresAt:now+IDLE_TIMEOUT_MS});
  expect(decodeIdleSession(cookie,now+IDLE_TIMEOUT_MS)).toBeNull();
  expect(decodeIdleSession(undefined)).toBeNull();
  expect(decodeIdleSession(cookie+'.extra')).toBeNull();
  expect(decodeIdleSession(cookie.replace(/.$/,cookie.endsWith('0')?'1':'0'))).toBeNull();
  expect(decodeIdleSession(encodeIdleSession('user',now+1))).toBeNull();
 });
 it('writes an HttpOnly cookie with a one-hour lifetime only when touched',async()=>{
  expect(await touchIdleSession('user')).toBe(now+IDLE_TIMEOUT_MS);
  expect(mocks.set).toHaveBeenCalledWith(IDLE_COOKIE,expect.any(String),expect.objectContaining({httpOnly:true,sameSite:'lax',path:'/',maxAge:3600}));
 });
 it('clears auth cookies and blocks access before automatic token refresh',async()=>{
  mocks.get.mockReturnValue({value:encodeIdleSession('user',now-IDLE_TIMEOUT_MS)});
  await expect(requireProfile()).rejects.toMatchObject({status:401});
  expect(mocks.updateSession).not.toHaveBeenCalled();expect(mocks.createServerClient).not.toHaveBeenCalled();
  expect(mocks.set.mock.calls.map(call=>call[0])).toEqual([IDLE_COOKIE,'insforge_access_token','insforge_refresh_token']);
  expect(mocks.set.mock.calls.every(call=>call[2].maxAge===0)).toBe(true);
 });
 it('reading a valid session does not extend its inactivity deadline',async()=>{
  const cookie=encodeIdleSession('user');mocks.get.mockReturnValue({value:cookie});
  vi.setSystemTime(now+IDLE_TIMEOUT_MS-1000);
  expect(await requireIdleSession()).toEqual({userId:'user',expiresAt:now+IDLE_TIMEOUT_MS});
  expect(mocks.set).not.toHaveBeenCalled();
 });
});
