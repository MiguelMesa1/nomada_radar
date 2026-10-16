import {normalize,toCSV} from './analytics';
import {postBrand,postLine} from './classification';
import type {interactionRanking} from './interaction-ranking';
import type {Sale} from './types';

export type InteractionRow=ReturnType<typeof interactionRanking>[number];
export function filterInteractions(rows:InteractionRow[],sales:Sale[],query='',line='',sort='interactions'){
 const q=normalize(query);
 return rows.filter(({post})=>(!line||postLine(post,sales)===line)&&(!q||normalize(`${post.post_id} ${post.nombre_creativo} ${postLine(post,sales)} ${postBrand(post,sales)}`).includes(q)))
  .sort((a,b)=>sort==='conversion'?(b.rate??-1)-(a.rate??-1)||b.interactions!-a.interactions!:sort==='orders'?b.post.orders-a.post.orders||b.interactions!-a.interactions!:b.interactions!-a.interactions!||b.post.orders-a.post.orders||a.post.post_id.localeCompare(b.post.post_id));
}
export function summarizeInteractions(rows:InteractionRow[],sales:Sale[]){
 const active=rows.filter(row=>row.interactions!>0),total=active.reduce((sum,row)=>sum+row.interactions!,0);
 const orders=active.reduce((sum,row)=>sum+row.post.orders,0);
 const withoutSales=active.filter(row=>!row.post.orders).reduce((sum,row)=>sum+row.interactions!,0);
 const top=[...active].sort((a,b)=>b.interactions!-a.interactions!);
 const lines=new Map<string,{name:string;interactions:number;orders:number}>();
 for(const row of active){const name=postLine(row.post,sales),group=lines.get(name)??{name,interactions:0,orders:0};group.interactions+=row.interactions!;group.orders+=row.post.orders;lines.set(name,group);}
 return {total,orders,rate:total?orders/total*100:null,active:active.length,withoutSales,leader:top[0],topThreeShare:total?top.slice(0,3).reduce((sum,row)=>sum+row.interactions!,0)/total*100:null,lines:[...lines.values()].sort((a,b)=>b.interactions-a.interactions),salesWithoutInteractions:rows.filter(row=>row.interactions===0).reduce((sum,row)=>sum+row.post.orders,0)};
}
export function interactionsCSV(rows:InteractionRow[],sales:Sale[]){
 const total=rows.reduce((sum,row)=>sum+row.interactions!,0);
 return toCSV(['Post ID','Nombre corto','Línea','Marca','Interacciones','Participación interacciones %','Ventas','Conversión ventas/interacciones %'],rows.map(row=>[row.post.post_id,row.post.nombre_creativo,postLine(row.post,sales),postBrand(row.post,sales),row.interactions,total?row.interactions!/total*100:null,row.post.orders,row.rate]));
}
