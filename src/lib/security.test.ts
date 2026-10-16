import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
vi.mock('server-only',()=>({}));
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('./server',()=>({adminClient:()=>({database:{rpc}}),sameOrigin:vi.fn()}));
import {consumeLimits,protectAccount,requestIdentity,protectUser} from './security';
beforeEach(()=>{vi.stubEnv('INSFORGE_API_KEY','test-only-not-a-real-key');vi.stubEnv('VERCEL','');vi.stubEnv('RADAR_TRUST_PROXY_HEADER','');rpc.mockResolvedValue({data:{allowed:true,retry_after:1},error:null})});
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()});
describe('Shared rate limits',()=>{
 it('uses only digests in the shared store and rejects denied calls with retry metadata',async()=>{
  rpc.mockResolvedValueOnce({data:{allowed:false,retry_after:37},error:null});
  await expect(consumeLimits([{key:'email:private@example.com',limit:3,seconds:60}])).rejects.toMatchObject({status:429,retryAfter:37});
  const payload=rpc.mock.calls[0][1];expect(payload.p_limits[0].key).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(payload)).not.toContain('private@example.com');
 });
 it('fails closed when the shared store is unavailable or returns malformed data',async()=>{
  rpc.mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValueOnce({data:{},error:null});
  await expect(consumeLimits([{key:'a',limit:1,seconds:60}])).rejects.toMatchObject({status:503});
  await expect(consumeLimits([{key:'a',limit:1,seconds:60}])).rejects.toMatchObject({status:503});
 });
 it('normalizes account identities and applies a global sync budget as well as a user limit',async()=>{
  await protectAccount(' Person@Example.com ','login');const key=rpc.mock.calls[0][1].p_limits[0].key;
  await protectAccount('person@example.com','login');expect(rpc.mock.calls[1][1].p_limits[0].key).toBe(key);
  await protectUser('user-a','sync');expect(rpc.mock.calls[2][1].p_limits).toHaveLength(2);
 });
 it('ignores spoofed forwarding headers unless the deployment explicitly trusts the proxy',()=>{
  const r=new Request('http://localhost',{headers:{'x-forwarded-for':'1.2.3.4','x-real-ip':'5.6.7.8'}});
  expect(requestIdentity(r)).toBe('shared-origin');vi.stubEnv('RADAR_TRUST_PROXY_HEADER','x-real-ip');expect(requestIdentity(r)).toBe('5.6.7.8');
 });
});
