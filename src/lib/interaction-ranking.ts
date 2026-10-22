import {metrics} from './analytics';
import {conversionForPost} from './conversion';
import type {Snapshot,CatalogPost} from './types';

export function interactionRanking(snapshot:Snapshot,range:{from:string;to:string}){
 const catalog=[...snapshot.catalog],known=new Set(catalog.map(p=>p.post_id));
 const ids=new Set([...(snapshot.interactions??[]).map(c=>c.post_id),...(snapshot.dailyInteractions??[]).flatMap(g=>g.rows.map(r=>r.post_id))]);
 for(const id of ids)if(!known.has(id))catalog.push({post_id:id,nombre_creativo:id,producto:'',campana:'',plataforma:'Otra',fecha_inicio:'',activo:true} satisfies CatalogPost);
 const sales=snapshot.sales;
 return metrics(sales,catalog,range.from,range.to).posts.map(post=>({post,...conversionForPost(post.post_id,post.orders,snapshot.interactions??[],range,snapshot.dailyInteractions??[])})).filter(row=>row.interactions!==null).sort((a,b)=>b.interactions!-a.interactions!||b.post.orders-a.post.orders||a.post.post_id.localeCompare(b.post.post_id));
}
