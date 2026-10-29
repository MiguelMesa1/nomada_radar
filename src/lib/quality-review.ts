import {canonicalLine,isMissingLine,postLine} from './classification';
import {attachMetaAds,type MetaAd} from './meta-ad-data';
import type {Sale,CatalogPost} from './types';

export function isOrganicUnattributed(sale:Sale){return !sale.post_id.trim()&&canonicalLine(sale.linea)==='Otra marca';}
export function qualitySales(sales:Sale[]){return sales.filter(sale=>!isOrganicUnattributed(sale));}
export function unknownCatalogPosts(sales:Sale[],catalog:CatalogPost[],ads:MetaAd[]=[]){
 const known=new Set(catalog.map(post=>post.post_id)),groups=new Map<string,Sale[]>();
 for(const sale of sales){const id=sale.post_id.trim();if(!id||known.has(id))continue;const group=groups.get(id);if(group)group.push(sale);else groups.set(id,[sale]);}
 return [...groups].map(([id,rows])=>{
  const post=attachMetaAds([{post_id:id,nombre_creativo:id,producto:'',campana:'',plataforma:'Otra',activo:true,fecha_inicio:rows.map(row=>row.fecha_venta.slice(0,10)).sort()[0]}],ads)[0];
  const inferred=postLine(post,rows);
  return {post,orders:rows.length,suggestedLine:!isMissingLine(inferred)&&inferred!=='Otra marca'?inferred:'',summaries:[...new Set(rows.map(row=>row.resumen_pedido?.trim()).filter((value):value is string=>!!value))].slice(0,3)};
 }).sort((a,b)=>b.orders-a.orders||a.post.post_id.localeCompare(b.post.post_id));
}
export type UnknownCatalogPost=ReturnType<typeof unknownCatalogPosts>[number];
