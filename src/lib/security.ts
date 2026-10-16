import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {adminClient,sameOrigin} from './server';
import {AppError} from './errors';
import {BurstLimiter,validateRequestSize} from './http-security';

export type Action='login'|'recover'|'refresh'|'read'|'export'|'write'|'admin'|'sync'|'logout';
const policy:Record<Action,[number,number]>={login:[12,600],recover:[8,1800],refresh:[30,60],read:[90,60],export:[8,60],write:[30,60],admin:[12,60],sync:[3,300],logout:[20,60]};
const burst=new BurstLimiter();
function hash(value:string){const secret=process.env.INSFORGE_API_KEY;if(!secret)throw new AppError('La protección de acceso no está disponible.',503);return createHmac('sha256',secret).update(value).digest('hex')}
export function requestIdentity(request:Request){
 // Ignore arbitrary X-Forwarded-For by default. A proxy header can be trusted
 // only when that proxy overwrites it and direct origin access is blocked.
 const header=process.env.VERCEL==='1'?'x-vercel-forwarded-for':process.env.RADAR_TRUST_PROXY_HEADER;
 if(header&&['x-vercel-forwarded-for','x-real-ip','x-forwarded-for'].includes(header)){
  const candidate=request.headers.get(header)?.split(',')[0]?.trim();if(candidate&&isIP(candidate))return candidate;
 }
 return 'shared-origin';
}
export async function consumeLimits(limits:{key:string;limit:number;seconds:number}[]){
 const {data,error}=await adminClient().database.rpc('radar_consume_limits',{p_limits:limits.map(v=>({key:hash(v.key),limit:v.limit,seconds:v.seconds}))});
 if(error||!data||typeof data.allowed!=='boolean')throw new AppError('La protección de acceso no está disponible. Intenta más tarde.',503);
 if(!data.allowed)throw new AppError('Has realizado demasiadas solicitudes. Espera antes de intentar de nuevo.',429,Math.max(1,Number(data.retry_after)||60));
}
export async function protectRequest(request:Request,action:Action){
 validateRequestSize(request);
 if(!['GET','HEAD'].includes(request.method))sameOrigin(request);
 const identity=requestIdentity(request),[limit,seconds]=policy[action];
 const local=burst.consume(hash('burst:'+action+':'+identity),limit,seconds);
 if(!local.allowed)throw new AppError('Has realizado demasiadas solicitudes. Espera antes de intentar de nuevo.',429,local.retryAfter);
 await consumeLimits([{key:'all-api',limit:600,seconds:60},{key:action+':ip:'+identity,limit,seconds}]);
}
export async function protectUser(id:string,action:Action){
 const [limit,seconds]=policy[action];
 await consumeLimits([{key:action+':user:'+id,limit,seconds},...(action==='sync'?[{key:'sync:all-users',limit:1,seconds:60}]:[])]);
}
export async function protectAccount(email:string,action:'login'|'recover'){
 await consumeLimits([{key:action+':account:'+email.trim().toLowerCase(),limit:action==='login'?8:3,seconds:action==='login'?600:1800}]);
}
