import {requireIdleSession} from './session-idle-server';
import {backendFetch} from './backend-fetch';
import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@insforge/sdk/ssr';
import { createAdminClient } from '@insforge/sdk';
import { NextResponse } from 'next/server';
import type { Profile, Role } from './types';
import { z } from 'zod';
import { isSameOrigin } from './request-origin';
import {updateSession} from '@insforge/sdk/ssr/middleware';
import {authCookieSettings} from './auth-cookie-settings';
import {AppError} from './errors';
export {AppError} from './errors';
export function adminClient(){if(!process.env.INSFORGE_API_KEY)throw new AppError('La administración no está disponible temporalmente.',503);return createAdminClient({baseUrl:process.env.NEXT_PUBLIC_INSFORGE_URL!,apiKey:process.env.INSFORGE_API_KEY,fetch:backendFetch});}
export async function requireProfile(roles:Role[]=['principal','analista','visualizador']){
 if(!process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)throw new AppError('Radar no está disponible temporalmente. Intenta de nuevo más tarde.',503);
 const idleSession=await requireIdleSession();
 const jar=await cookies();
 if(jar.has('insforge_refresh_token'))await updateSession({requestCookies:jar,responseCookies:jar,fetch:backendFetch,...authCookieSettings});
 const client=createServerClient({cookies:jar,fetch:backendFetch});const {data,error}=await client.auth.getCurrentUser();
 if(error||!data?.user||data.user.id!==idleSession.userId)throw new AppError('Inicia sesión para continuar.',401);
 const result=await client.database.from('user_profiles').select('user_id,nombre,email,role,activo').eq('user_id',data.user.id).single();
 if(result.error||!result.data?.activo)throw new AppError('Tu cuenta aún no tiene acceso a Radar o fue suspendida.',403);
 const profile=result.data as Profile;if(!roles.includes(profile.role))throw new AppError('Tu rol no permite esta acción.',403);
 return {client,profile,sessionExpiresAt:idleSession.expiresAt};
}
export function sameOrigin(request:Request){if(!isSameOrigin(request))throw new AppError('Solicitud de origen no permitido.',403)}
export function failure(e:unknown){const headers:Record<string,string>={'Cache-Control':'no-store'};if(e instanceof AppError){if(e.status===429)headers['Retry-After']=String(e.retryAfter??60);return NextResponse.json({error:e.message},{status:e.status,headers})}console.error('Radar request failed', e instanceof Error?e.name:'unknown');return NextResponse.json({error:'No pudimos completar la operación. Revisa tu conexión e intenta de nuevo.'},{status:500,headers});}
export function parseRange(url:URL){const from=url.searchParams.get('from'),to=url.searchParams.get('to');if(!from||!to||!z.iso.date().safeParse(from).success||!z.iso.date().safeParse(to).success||from>to||Date.parse(to)-Date.parse(from)>365*86400000)throw new AppError('Elige un periodo válido de hasta 366 días.');return{from,to};}
export async function audit(actor:string,accion:string,objeto:string){const {error}=await adminClient().database.from('audit_logs').insert([{actor_id:actor,accion,objeto}]);if(error)throw new AppError('No se pudo registrar la auditoría.',503)}
