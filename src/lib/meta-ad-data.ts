import type {CatalogPost} from './types';
export type MetaAd={id:string;name:string;facebookUrl:string|null;instagramUrl:string|null;thumbnailUrl?:string|null;frequency:number|null;impressions:number|null;reach:number|null;spend?:number|null;cpc?:number|null;cpm?:number|null;currency?:string|null};
export function metaCatalogOnly(ads:MetaAd[]):MetaAd[]{return ads.map(ad=>({...ad,frequency:null,impressions:null,reach:null,spend:null,cpc:null,cpm:null,currency:null}));}
export function mergeMetaAds(catalog:MetaAd[],insights:MetaAd[]):MetaAd[]{
 const rows=new Map(metaCatalogOnly(catalog).map(ad=>[ad.id,ad]));
 for(const insight of insights){const ad=rows.get(insight.id);rows.set(insight.id,{...ad,...insight,name:ad?.name||insight.name,facebookUrl:ad?.facebookUrl??insight.facebookUrl,instagramUrl:ad?.instagramUrl??insight.instagramUrl,thumbnailUrl:ad?.thumbnailUrl??insight.thumbnailUrl})}
 return [...rows.values()];
}
export function metaPreviewURL(value:unknown){
 if(typeof value!=='string'||value.length>4096)return null;
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||!['fbcdn.net','cdninstagram.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host))||[...url.searchParams.keys()].some(key=>['access_token','appsecret_proof'].includes(key.toLowerCase())))return null;return url.href;}catch{return null;}
}
const costFormatters=new Map<string,Intl.NumberFormat>();
export function formatMetaCost(amount:number|null|undefined,currency:string|null|undefined){
 if(amount===undefined||amount===null||!Number.isFinite(amount)||!currency||!/^[A-Z]{3}$/.test(currency))return 'Sin dato';
 let formatter=costFormatters.get(currency);
 if(!formatter){formatter=new Intl.NumberFormat('es-CO',{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2});costFormatters.set(currency,formatter)}
 return formatter.format(amount);
}
export const metaCostColumns=['Moneda Meta','Gasto total Meta','CPC Meta (todos los clics)','CPM Meta'];
export const metaCostValues=(post:CatalogPost)=>[post.meta?.currency??null,post.meta?.spend??null,post.meta?.cpc??null,post.meta?.cpm??null];
export function attachMetaAds(catalog:CatalogPost[],ads:MetaAd[]):CatalogPost[]{
 const byId=new Map(ads.map(ad=>[ad.id,ad]));
 return catalog.map(post=>{const meta=byId.get(post.post_id);return {...post,nombre_creativo:meta?.name?.trim()||post.nombre_creativo,meta}});
}
export function metaNumber(value:unknown):number|null{
 if(value===undefined||value===null||value==='')return null;
 const number=Number(value);return Number.isFinite(number)&&number>=0?number:null;
}
