import 'server-only';
import {unstable_cache} from 'next/cache';
import {loadMetaCatalog,loadMetaInsights} from './meta-ads';
import {mergeMetaAds} from './meta-ad-data';
import {AppError} from './errors';
const inFlight=new Map<string,Promise<Awaited<ReturnType<typeof loadMetaCatalog>>>>();
function sharedRequest(key:string,load:()=>ReturnType<typeof loadMetaCatalog>){
 const existing=inFlight.get(key);if(existing)return existing;
 const pending=load().finally(()=>inFlight.delete(key));inFlight.set(key,pending);return pending;
}
// Cache rate limits as data so simultaneous views and day changes respect the cooldown.
const catalogAttempt=unstable_cache(async(account:string)=>{
 try{return {ads:await sharedRequest('catalog:'+account,()=>loadMetaCatalog(account))}}catch(error){
  if(error instanceof AppError&&error.status===429)return {error:error.message,retryAfter:error.retryAfter??300};
  throw error;
 }
},['radar-meta-catalog-attempt-v4'],{revalidate:300});
const catalog=unstable_cache(async(account:string)=>{
 const result=await catalogAttempt(account);
 if(result.error)throw new AppError(result.error,429,result.retryAfter);
 return result.ads!;
},['radar-meta-catalog-v4'],{revalidate:3600});
const insights=unstable_cache((account:string,from:string,to:string)=>sharedRequest(`insights:${account}:${from}:${to}`,()=>loadMetaInsights(account,from,to)),['radar-meta-insights-v4'],{revalidate:900});
export async function cachedMetaReport(account:string,from:string,to:string){
 const [ads,metrics]=await Promise.allSettled([catalog(account),insights(account,from,to)]);
 if(metrics.status==='rejected')throw metrics.reason;
 if(ads.status==='rejected'){
  if(!(ads.reason instanceof AppError))throw ads.reason;
  return {ads:metrics.value,catalogAvailable:false,warning:'Las cifras corresponden al periodo seleccionado. '+ads.reason.message+' Los nombres y enlaces de otros anuncios pueden no estar disponibles.'};
 }
 return {ads:mergeMetaAds(ads.value,metrics.value),catalogAvailable:true};
}
// Exports keep their existing array contract and use the same independently cached data.
export async function cachedMetaAds(account:string,from:string,to:string){return (await cachedMetaReport(account,from,to)).ads;}
