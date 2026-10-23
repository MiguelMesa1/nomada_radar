import 'server-only';
import {AppError} from './errors';
import {publicationLink} from './publication-link';
import {metaNumber,type MetaAd} from './meta-ad-data';

type Ad={id:string;name:string;creative?:{effective_object_story_id?:string;instagram_permalink_url?:string}};
type Insight={ad_id:string;ad_name?:string;frequency?:string;impressions?:string;reach?:string;spend?:string;cpc?:string;cpm?:string;account_currency?:string};
export async function loadMetaAds(account:string,from:string,to:string):Promise<MetaAd[]>{
 const token=process.env.META_ACCESS_TOKEN;
 if(!token||!/^\d+$/.test(account))throw new AppError('Falta configurar la conexión con Meta.',503);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 async function pages<T>(edge:string,params:Record<string,string>):Promise<T[]>{
  const rows:T[]=[];let after='';
  for(let page=0;page<50;page++){
   const url=new URL(`https://graph.facebook.com/v26.0/act_${account}/${edge}`);
   for(const [key,value]of Object.entries({...params,limit:'100',...(after?{after}:{})}))url.searchParams.set(key,value);
   const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),cache:'no-store'});
   const body=await response.json();
   if(!response.ok||body.error)throw new AppError(body.error?.code===190?'La conexión con Meta venció. Actualiza el token.':body.error?.code===200?'Meta no permite consultar esta cuenta publicitaria. Revisa los activos asignados.':'No pudimos consultar Meta. Intenta de nuevo más tarde.',502);
   if(!Array.isArray(body.data))throw new AppError('Meta devolvió una respuesta incompleta.',502);
   rows.push(...body.data);
   if(!body.paging?.next)return rows;
   if(!body.paging.cursors?.after||page===49)throw new AppError('La cuenta supera el límite de consulta de Meta. No mostramos resultados parciales.',422);
   // Never follow next URLs: they can contain credentials. Rebuild our own URL.
   after=body.paging.cursors.after;
  }
  return rows;
 }
 try{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(new Date()),until=to>today?today:to;
  const [ads,insights]=await Promise.all([
   pages<Ad>('ads',{fields:'id,name,creative{effective_object_story_id,instagram_permalink_url}'}),
   from>until?Promise.resolve([] as Insight[]):pages<Insight>('insights',{fields:'ad_id,ad_name,frequency,impressions,reach,spend,cpc,cpm,account_currency',level:'ad',time_range:JSON.stringify({since:from,until})}),
  ]);
  const metrics=new Map(insights.map(row=>[row.ad_id,row]));
  const allAds=new Map(ads.map(ad=>[ad.id,ad]));
  for(const insight of insights)if(!allAds.has(insight.ad_id))allAds.set(insight.ad_id,{id:insight.ad_id,name:insight.ad_name??insight.ad_id});
  return [...allAds.values()].map(ad=>{
   const insight=metrics.get(ad.id),story=ad.creative?.effective_object_story_id?.match(/^(\d+)_(\d+)$/);
   return {id:ad.id,name:ad.name,facebookUrl:story?`https://www.facebook.com/${story[1]}/posts/${story[2]}`:null,instagramUrl:publicationLink(ad.creative?.instagram_permalink_url)?.url??null,frequency:metaNumber(insight?.frequency),impressions:metaNumber(insight?.impressions),reach:metaNumber(insight?.reach),spend:metaNumber(insight?.spend),cpc:metaNumber(insight?.cpc),cpm:metaNumber(insight?.cpm),currency:insight?.account_currency&&/^[A-Z]{3}$/.test(insight.account_currency)?insight.account_currency:null};
  });
 }catch(error){if(error instanceof AppError)throw error;throw new AppError('Meta tardó demasiado o no está disponible. Puedes seguir consultando las ventas.',502)}finally{clearTimeout(timer);controller.abort()}
}
