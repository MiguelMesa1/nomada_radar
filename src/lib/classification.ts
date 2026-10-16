import type { CatalogPost,Sale } from './types';
const lineKey=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export const preparedLines=['XTZ 125','XTZ 150','Pulsar 180','Superlander','Boxer CT 100','NS 200','Cúpula','Accesorios'];
export function canonicalLine(value:unknown){
 const text=String(value??'').trim(),key=lineKey(text);
 const aliases:Record<string,string>={'pulsar':'Pulsar 180','pulsar 180':'Pulsar 180','pulsar180':'Pulsar 180','xtz125':'XTZ 125','xtz 125':'XTZ 125','xtz150':'XTZ 150','xtz 150':'XTZ 150','superlander':'Superlander','boxer':'Boxer CT 100','boxer ct 100':'Boxer CT 100','ns':'NS 200','ns200':'NS 200','ns 200':'NS 200','cupula':'Cúpula','accesorios':'Accesorios'};
 return aliases[key]??text;
}
export function saleLine(sale:Sale,catalog:CatalogPost[]=[]){
 const line=canonicalLine(sale.linea),post=catalog.find(p=>p.post_id===sale.post_id);
 // Ventas!B716 explicitly names XTZ 125 (verified 2026-10-16). Guard
 // identity, date and missing Post ID so this is not a global XTZ alias.
 if(lineKey(line)==='xtz'){
  const model=post?canonicalLine(post.producto):'';
  if(['XTZ 125','XTZ 150'].includes(model))return model;
  if(!sale.post_id&&!!process.env.NEXT_PUBLIC_RADAR_XTZ_125_ROW&&sale.pedido_id===process.env.NEXT_PUBLIC_RADAR_XTZ_125_ROW&&Date.parse(sale.fecha_venta)===Date.parse('2026-10-01T21:56:35.000Z'))return 'XTZ 125';
 }
 return line||(post?postLine(post):'');
}
export function postLine(post:CatalogPost,sales:Sale[]=[]){
 if(post.producto.trim())return canonicalLine(post.producto);
 const counts=new Map<string,number>();for(const s of sales)if(s.post_id===post.post_id&&canonicalLine(s.linea)){const line=canonicalLine(s.linea);counts.set(line,(counts.get(line)??0)+1);}
 return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??'Sin línea';
}
export function manufacturer(line:string){
 const key=lineKey(canonicalLine(line));
 if(/^xtz(?:\s|$)/.test(key))return 'Yamaha';
 if(/^(?:pulsar|ns\s?200|boxer)(?:\s|$)/.test(key))return 'Bajaj';
 if(key==='superlander')return 'Superlander';
 return 'Sin marca';
}
export function postBrand(post:CatalogPost,sales:Sale[]=[]){return post.marca?.trim()||manufacturer(postLine(post,sales));}
export function saleBrand(sale:Sale,catalog:CatalogPost[]){const post=catalog.find(p=>p.post_id===sale.post_id);return post?.marca?.trim()||manufacturer(saleLine(sale,catalog));}
