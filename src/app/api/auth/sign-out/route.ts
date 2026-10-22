import {clearSessionCookies} from '@/lib/session-idle-server';
import {backendFetch} from '@/lib/backend-fetch';
import {protectRequest} from '@/lib/security';
import {authCookieSettings} from '@/lib/auth-cookie-settings';
import { cookies } from 'next/headers';
import { createAuthActions } from '@insforge/sdk/ssr';
import { NextResponse } from 'next/server';
import { failure,sameOrigin } from '@/lib/server';
export async function POST(r:Request){try{
 sameOrigin(r);
 const jar=await cookies();
 try{
  await protectRequest(r,'logout');
  await createAuthActions({cookies:jar,fetch:backendFetch,...authCookieSettings}).signOut();
 }catch{
  // Logout must still clear this browser when the upstream or limiter is down.
 }finally{clearSessionCookies(jar)}
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e)}}
