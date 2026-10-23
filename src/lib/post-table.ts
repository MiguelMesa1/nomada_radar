import {postLine} from './classification';
import {conversionForPost} from './conversion';
import type {PostMetric,Snapshot} from './types';

export const postColumns=[
 {key:'id',label:'Post ID · Creativo'}, {key:'line',label:'Línea'},
 {key:'orders',label:'Pedidos'}, {key:'interactions',label:'Interacciones'},
 {key:'conversion',label:'Conversión'}, {key:'frequency',label:'Frecuencia Meta'},
 {key:'spend',label:'Gasto Meta'}, {key:'cpc',label:'CPC',description:'Costo medio por clic (todos los clics), según Meta.'}, {key:'cpm',label:'CPM',description:'Costo por mil impresiones, según Meta.'}, {key:'value',label:'Valor'},
 {key:'ticket',label:'Ticket'}, {key:'share',label:'Participación'},
 {key:'trend',label:'Tendencia',description:'Cambio en pedidos: últimos 7 días frente a los 7 anteriores'},
 {key:'status',label:'Estado'},
] as const;
export type PostSortKey=typeof postColumns[number]['key'];
export type SortDirection='asc'|'desc';
export const defaultPostDirection=(key:string):SortDirection=>['id','line','name','status'].includes(key)?'asc':'desc';
type SortContext=Pick<Snapshot,'sales'|'interactions'|'dailyInteractions'>&{range:{from:string;to:string}};
export function sortPostMetrics(posts:PostMetric[],context:SortContext,key:string='orders',direction:SortDirection='desc'){
 const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
 const values=new Map(posts.map(post=>{
  let value:string|number|null;
  switch(key){
   case 'id':value=post.post_id;break;
   case 'name':value=post.nombre_creativo;break;
   case 'line':value=postLine(post,context.sales);break;
   case 'interactions':case 'conversion':{const measurement=conversionForPost(post.post_id,post.orders,context.interactions??[],context.range,context.dailyInteractions??[]);value=key==='interactions'?measurement.interactions:measurement.rate;break;}
   case 'value':value=post.pricedOrders||!post.orders?post.value:null;break;
   case 'frequency':value=post.meta?.frequency??null;break;
   case 'spend':case 'cpc':case 'cpm':value=post.meta?.[key]??null;break;
   case 'ticket':value=post.ticket;break;
   case 'share':value=post.share;break;
   case 'trend':value=post.trend.slice(-7).reduce((sum,n)=>sum+n,0)-post.trend.slice(-14,-7).reduce((sum,n)=>sum+n,0);break;
   case 'status':value=!post.activo?'Inactivo':post.orders?'Con ventas':'Sin ventas';break;
   default:value=post.orders;
  }
  return [post.post_id,value] as const;
 }));
 return [...posts].sort((a,b)=>{
  const av=values.get(a.post_id)??null,bv=values.get(b.post_id)??null;
  // Missing amounts and denominators always follow known values, even ascending.
  if(av===null||bv===null)return av===bv?collator.compare(a.post_id,b.post_id):av===null?1:-1;
  const comparison=typeof av==='number'&&typeof bv==='number'?av-bv:collator.compare(String(av),String(bv));
  return comparison*(direction==='asc'?1:-1)||collator.compare(a.post_id,b.post_id);
 });
}
