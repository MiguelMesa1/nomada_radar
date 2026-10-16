import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {failure,AppError} from './server';
import {authCookieSettings} from './auth-cookie-settings';
describe('Security responses and server-only sessions',()=>{
 it('returns HTTP 429 with Retry-After and no-store, while keeping internal exceptions private',async()=>{
  const response=failure(new AppError('Demasiadas solicitudes.',429,37));
  expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('37');expect(response.headers.get('cache-control')).toBe('no-store');
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const error=failure(new Error('private-database-detail'));
  expect(error.status).toBe(500);expect(await error.text()).not.toContain('private-database-detail');log.mockRestore();
 });
 it('prevents JavaScript from reading either session cookie',()=>{
  expect(authCookieSettings.options?.accessToken?.httpOnly).toBe(true);
  expect(authCookieSettings.options?.refreshToken?.httpOnly).toBe(true);
 });
});
