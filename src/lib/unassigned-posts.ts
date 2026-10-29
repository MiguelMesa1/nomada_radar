import {isMissingLine} from './classification';
import {publicationLink} from './publication-link';
import type {MetaAd} from './meta-ad-data';
import type {CatalogPost,Snapshot} from './types';

export function unassignedPostLinks(post:CatalogPost){
 const networks=new Set<string>();
 return [post.publicacion_url,post.meta?.facebookUrl,post.meta?.instagramUrl].flatMap(url=>{
  const link=publicationLink(url);
  if(!link||networks.has(link.network))return [];
  networks.add(link.network);return [link];
 });
}

export function unassignedPosts(snapshot:Snapshot,ads:MetaAd[]=[]):CatalogPost[]{
 const posts=new Map(snapshot.catalog.map(post=>[post.post_id,post]));
 const meta=new Map(ads.map(ad=>[ad.id,ad]));
 // Only the Excel interaction counts create work in this queue. Meta enriches
 // matching IDs, but its historical ad catalogue must not create assignments.
 const ids=new Set([...(snapshot.interactions??[]).filter(row=>row.interacciones>0).map(row=>row.post_id),...(snapshot.dailyInteractions??[]).flatMap(group=>group.rows.filter(row=>row.interacciones>0).map(row=>row.post_id))].filter(id=>id.trim()));
 for(const id of ids)if(id.trim()&&!posts.has(id))posts.set(id,{post_id:id,nombre_creativo:id,producto:'',campana:'',plataforma:'Otra',activo:true,fecha_inicio:''});
 return [...posts.values()].filter(post=>ids.has(post.post_id)&&isMissingLine(post.producto)).map(post=>{
  const ad=meta.get(post.post_id)??post.meta;
  const enriched={...post,nombre_creativo:ad?.name?.trim()||post.nombre_creativo,meta:ad};
  const link=unassignedPostLinks(enriched)[0];
  return {...enriched,publicacion_url:publicationLink(post.publicacion_url)?.url??link?.url??null};
 }).sort((a,b)=>Number(b.activo)-Number(a.activo)||a.post_id.localeCompare(b.post_id,'es'));
}
