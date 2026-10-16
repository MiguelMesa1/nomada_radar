import {backendFetch} from '@/lib/backend-fetch';
import {protectRequest} from '@/lib/security';
import {authCookieSettings} from '@/lib/auth-cookie-settings';
import { cookies } from 'next/headers';
import { createAuthActions } from '@insforge/sdk/ssr';
import { NextResponse } from 'next/server';
import { failure } from '@/lib/server';
export async function POST(r:Request){try{await protectRequest(r,'logout');await createAuthActions({cookies:await cookies(),fetch:backendFetch,...authCookieSettings}).signOut();return NextResponse.json({ok:true})}catch(e){return failure(e)}}
