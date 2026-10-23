import type {CatalogPost} from './types';
export type MetaAd={id:string;name:string;facebookUrl:string|null;instagramUrl:string|null;frequency:number|null;impressions:number|null;reach:number|null;spend?:number|null;cpc?:number|null;cpm?:number|null;currency?:string|null};
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
