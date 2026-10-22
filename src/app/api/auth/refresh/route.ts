import {requireIdleSession} from '@/lib/session-idle-server';
import {backendFetch} from '@/lib/backend-fetch';
import {refreshAuth} from '@insforge/sdk/ssr';
import {NextResponse} from 'next/server';
import {protectRequest} from '@/lib/security';
import {authCookieSettings} from '@/lib/auth-cookie-settings';
import {failure} from '@/lib/server';
export async function POST(request:Request){try{
 await protectRequest(request,'refresh');
 await requireIdleSession();
 const result=await refreshAuth({request,fetch:backendFetch,...authCookieSettings});
 const headers=new Headers(result.response.headers);headers.delete('content-length');headers.set('Cache-Control','no-store');
 return NextResponse.json(result.error?{error:'No pudimos renovar la sesión. Inicia sesión de nuevo.'}:{ok:true},{status:result.error?401:200,headers});
}catch(error){return failure(error)}}
