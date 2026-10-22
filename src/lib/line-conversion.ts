import {metrics,normalize,toCSV} from './analytics';
import {postLine,saleLine} from './classification';
import {conversionForPost} from './conversion';
import type {CatalogPost,PostMetric,Snapshot,Sale} from './types';

export type ConversionPost={post:PostMetric;interactions:number|null;rate:number|null};
export type LineConversion={name:string;orders:number;eligibleOrders:number;pendingOrders:number;withoutIdOrders:number;interactions:number|null;rate:number|null;posts:ConversionPost[];sales:Sale[]};

export function lineConversion(snapshot:Snapshot,range:{from:string;to:string}):LineConversion[]{
 const catalog=[...snapshot.catalog],known=new Set(catalog.map(p=>p.post_id));
 const ids=new Set([...snapshot.sales.map(s=>s.post_id),...(snapshot.interactions??[]).map(c=>c.post_id),...(snapshot.dailyInteractions??[]).flatMap(g=>g.rows.map(r=>r.post_id))]);
 for(const id of ids)if(id&&!known.has(id))catalog.push({post_id:id,nombre_creativo:id,producto:'',campana:'',plataforma:'Otra',fecha_inicio:'',activo:true} satisfies CatalogPost);
 const report=metrics(snapshot.sales,catalog,range.from,range.to),groups=new Map<string,LineConversion>();
 const group=(name:string)=>{let row=groups.get(name);if(!row){row={name,orders:0,eligibleOrders:0,pendingOrders:0,withoutIdOrders:0,interactions:null,rate:null,posts:[],sales:[]};groups.set(name,row)}return row};
 const postLines=new Map<string,string>();
 // Use the publication's line for both sides of the ratio, as in Interacciones.
 for(const post of report.posts){
  const conversion=conversionForPost(post.post_id,post.orders,snapshot.interactions??[],range,snapshot.dailyInteractions??[]);
  if(!post.orders&&!conversion.interactions)continue;
  const name=postLine(post,snapshot.sales),row=group(name);postLines.set(post.post_id,name);row.posts.push({post,...conversion});row.orders+=post.orders;
  if(conversion.interactions!==null)row.interactions=(row.interactions??0)+conversion.interactions;
  if(conversion.interactions!==null&&conversion.interactions>0)row.eligibleOrders+=post.orders;
  else row.pendingOrders+=post.orders;
 }
 for(const sale of report.current){
  const row=group(sale.post_id?(postLines.get(sale.post_id)??saleLine(sale,catalog))||'Sin línea':saleLine(sale,catalog)||'Sin línea');
  row.sales.push(sale);
  if(!sale.post_id){row.orders++;row.withoutIdOrders++;}
 }
 return [...groups.values()].map(row=>({...row,rate:row.interactions?row.eligibleOrders/row.interactions*100:null}));
}
export function filterLineConversion(rows:LineConversion[],query='',line='',sort='conversion'){
 const q=normalize(query);
 return rows.filter(row=>(!line||row.name===line)&&(!q||normalize(row.name).includes(q))).sort((a,b)=>(sort==='orders'?b.orders-a.orders:sort==='interactions'?(b.interactions??-1)-(a.interactions??-1):(b.rate??-1)-(a.rate??-1))||a.name.localeCompare(b.name));
}
export function lineConversionCSV(rows:LineConversion[]){
 return toCSV(['Línea','Ventas totales','Ventas comparables','Ventas sin base de interacciones','Sin ID','Interacciones del periodo','Conversión ventas/interacciones %'],rows.map(row=>[row.name,row.orders,row.eligibleOrders,row.pendingOrders,row.withoutIdOrders,row.interactions,row.rate]));
}
