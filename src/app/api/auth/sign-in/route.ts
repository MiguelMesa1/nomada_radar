import {touchIdleSession} from '@/lib/session-idle-server';
import {backendFetch} from '@/lib/backend-fetch';
import {protectRequest,protectAccount} from '@/lib/security';
import {readJSON} from '@/lib/http-security';
import {authCookieSettings} from '@/lib/auth-cookie-settings';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAuthActions,createServerClient } from '@insforge/sdk/ssr';
import { z } from 'zod';
import { AppError,failure } from '@/lib/server';
export async function POST(r:Request){try{await protectRequest(r,'login');const p=z.object({email:z.email().max(254),password:z.string().min(1).max(200)}).safeParse(await readJSON(r));if(!p.success)throw new AppError('Escribe un correo válido y tu contraseña.');if(!process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY)throw new AppError('El inicio de sesión no está disponible temporalmente. Contacta al administrador.',503);await protectAccount(p.data.email,'login');const jar=await cookies();const auth=createAuthActions({cookies:jar,fetch:backendFetch,...authCookieSettings});const {data,error}=await auth.signInWithPassword(p.data);if(error||!data?.user)throw new AppError('No pudimos ingresar. Revisa tu correo y contraseña.',401);const client=createServerClient({cookies:jar,fetch:backendFetch});const profile=await client.database.from('user_profiles').select('activo').eq('user_id',data.user.id).single();if(profile.error||!profile.data?.activo){await auth.signOut();throw new AppError('Tu cuenta no tiene acceso a Radar. Pídele autorización al administrador.',403)}await touchIdleSession(data.user.id);return NextResponse.json({ok:true});}catch(e){return failure(e)}}
