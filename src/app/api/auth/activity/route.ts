import {NextResponse} from 'next/server';
import {protectRequest} from '@/lib/security';
import {failure,requireProfile} from '@/lib/server';
import {touchIdleSession} from '@/lib/session-idle-server';
export async function POST(request:Request){try{
 await protectRequest(request,'refresh');
 const {profile}=await requireProfile();
 return NextResponse.json({expiresAt:await touchIdleSession(profile.user_id)},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error)}}
