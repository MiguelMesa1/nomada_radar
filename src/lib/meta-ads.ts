import 'server-only';
import {publicationLink} from './publication-link';
import {metaNumber,metaPreviewURL,mergeMetaAds,type MetaAd} from './meta-ad-data';
import {metaPages} from './meta-graph';
type Ad={id:string;name:string;creative?:{effective_object_story_id?:string;instagram_permalink_url?:string;thumbnail_url?:string}};
type Insight={ad_id:string;ad_name?:string;frequency?:string;impressions?:string;reach?:string;spend?:string;cpc?:string;cpm?:string;account_currency?:string};
export async function loadMetaCatalog(account:string):Promise<MetaAd[]>{
 const ads=await metaPages<Ad>(account,'ads',{fields:'id,name,creative{effective_object_story_id,instagram_permalink_url,thumbnail_url}'});
 return ads.map(ad=>{const story=ad.creative?.effective_object_story_id?.match(/^(\d+)_(\d+)$/);return {id:ad.id,name:ad.name,thumbnailUrl:metaPreviewURL(ad.creative?.thumbnail_url),facebookUrl:story?`https://www.facebook.com/${story[1]}/posts/${story[2]}`:null,instagramUrl:publicationLink(ad.creative?.instagram_permalink_url)?.url??null,frequency:null,impressions:null,reach:null,spend:null,cpc:null,cpm:null,currency:null}});
}
export async function loadMetaInsights(account:string,from:string,to:string):Promise<MetaAd[]>{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(new Date()),until=to>today?today:to;
 if(from>until)return [];
 const insights=await metaPages<Insight>(account,'insights',{fields:'ad_id,ad_name,frequency,impressions,reach,spend,cpc,cpm,account_currency',level:'ad',time_range:JSON.stringify({since:from,until})});
 return insights.map(row=>({id:row.ad_id,name:row.ad_name??row.ad_id,facebookUrl:null,instagramUrl:null,frequency:metaNumber(row.frequency),impressions:metaNumber(row.impressions),reach:metaNumber(row.reach),spend:metaNumber(row.spend),cpc:metaNumber(row.cpc),cpm:metaNumber(row.cpm),currency:row.account_currency&&/^[A-Z]{3}$/.test(row.account_currency)?row.account_currency:null}));
}
export async function loadMetaAds(account:string,from:string,to:string):Promise<MetaAd[]>{
 const [catalog,insights]=await Promise.all([loadMetaCatalog(account),loadMetaInsights(account,from,to)]);
 return mergeMetaAds(catalog,insights);
}
