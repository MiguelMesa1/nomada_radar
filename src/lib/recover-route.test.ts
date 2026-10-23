import {beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({exchange:vi.fn(),reset:vi.fn(),send:vi.fn()}));
vi.mock('@/lib/backend-fetch',()=>({backendFetch:fetch}));
vi.mock('@/lib/security',()=>({protectRequest:vi.fn(),protectAccount:vi.fn()}));
vi.mock('@/lib/http-security',()=>({readJSON:(request:Request)=>request.json()}));
vi.mock('@insforge/sdk',()=>({createClient:()=>({auth:{exchangeResetPasswordToken:mock.exchange,resetPassword:mock.reset,sendResetPasswordEmail:mock.send}})}));
vi.mock('@/lib/server',async()=>{
 const {AppError}=await import('./errors');
 return {AppError,failure:(error:InstanceType<typeof AppError>)=>Response.json({error:error.message},{status:error.status})};
});
import {POST} from '../app/api/auth/recover/route';
const request=(password:string)=>new Request('https://radar.test/api/auth/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'qa@example.test',stage:'reset',otp:'123456',password})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY','test');mock.exchange.mockResolvedValue({data:{token:'reset-token'}});mock.reset.mockResolvedValue({error:null})});
describe('password recovery minimum length',()=>{
 it('accepts seven characters and longer passwords',async()=>{
  for(const password of ['Ab1!xyz','Ab1!longer-password']){expect((await POST(request(password))).status).toBe(200);expect(mock.reset).toHaveBeenLastCalledWith({newPassword:password,otp:'reset-token'})}
 });
 it('rejects six characters before exchanging a recovery token',async()=>{
  const response=await POST(request('Ab1!xy'));expect(response.status).toBe(400);expect(await response.text()).toContain('al menos 7 caracteres');expect(mock.exchange).not.toHaveBeenCalled();expect(mock.reset).not.toHaveBeenCalled();
 });
});
