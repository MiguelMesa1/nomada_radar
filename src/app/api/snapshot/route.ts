import {protectRequest,protectUser} from '@/lib/security';
import { NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/data';
import { failure,parseRange,requireProfile } from '@/lib/server';
export async function GET(r:Request){try{await protectRequest(r,'read');const auth=await requireProfile();await protectUser(auth.profile.user_id,'read');const{from,to}=parseRange(new URL(r.url));return NextResponse.json(await loadSnapshot(from,to,auth),{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
