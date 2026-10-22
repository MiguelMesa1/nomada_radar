import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {AppError} from './errors';
import {IDLE_TIMEOUT_MS} from './idle-session';
export const IDLE_COOKIE='radar_idle_session';
const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
function signature(value:string){
 const secret=process.env.INSFORGE_API_KEY;
 if(!secret)throw new AppError('La protección de acceso no está disponible.',503);
 return createHmac('sha256',secret).update('radar-idle:'+value).digest('hex');
}
export function encodeIdleSession(userId:string,now=Date.now()){
 const value=Buffer.from(JSON.stringify({userId,expiresAt:now+IDLE_TIMEOUT_MS})).toString('base64url');
 return value+'.'+signature(value);
}
export function decodeIdleSession(cookie:string|undefined,now=Date.now()):{userId:string;expiresAt:number}|null{
 if(!cookie||cookie.length>2048)return null;
 const [value,mac,...extra]=cookie.split('.');if(!value||!mac||extra.length||!/^[a-f0-9]{64}$/.test(mac))return null;
 if(!timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(value),'hex')))return null;
 try{const data=JSON.parse(Buffer.from(value,'base64url').toString());return typeof data.userId==='string'&&data.userId&&Number.isFinite(data.expiresAt)&&data.expiresAt>now&&data.expiresAt<=now+IDLE_TIMEOUT_MS?data:null}catch{return null}
}
export async function requireIdleSession(){
 const jar=await cookies(),session=decodeIdleSession(jar.get(IDLE_COOKIE)?.value);
 if(!session){clearSessionCookies(jar);throw new AppError('Tu sesión se cerró tras una hora de inactividad. Inicia sesión de nuevo.',401)}
 return session;
}
export async function touchIdleSession(userId:string){
 const jar=await cookies(),now=Date.now();
 jar.set(IDLE_COOKIE,encodeIdleSession(userId,now),{...options,maxAge:IDLE_TIMEOUT_MS/1000});
 return now+IDLE_TIMEOUT_MS;
}
export function clearSessionCookies(jar:Awaited<ReturnType<typeof cookies>>){
 for(const name of [IDLE_COOKIE,'insforge_access_token','insforge_refresh_token'])jar.set(name,'',{...options,maxAge:0});
}
