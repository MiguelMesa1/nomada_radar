import {cachedMetaReport} from '@/lib/meta-ads-cache';
import {protectRequest,protectUser} from '@/lib/security';
import {requireProfile,parseRange,failure} from '@/lib/server';
export const maxDuration=60;
export async function GET(request:Request){try{
 await protectRequest(request,'read');const {profile}=await requireProfile();await protectUser(profile.user_id,'read');
 const {from,to}=parseRange(new URL(request.url));
 if(!process.env.META_ACCESS_TOKEN)return Response.json({configured:false,ads:[]},{headers:{'Cache-Control':'no-store'}});
 const report=await cachedMetaReport(process.env.META_AD_ACCOUNT_ID??'225078280870839',from,to);
 return Response.json({configured:true,...report},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error)}}
