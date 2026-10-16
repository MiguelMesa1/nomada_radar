import type { InteractionCount } from './types';
import { monthRange } from './report-period';
import type {DatedInteractionMonth} from './dated-interactions';
export function conversionForPost(postId:string,orders:number,counts:InteractionCount[],range:{from:string;to:string},daily:DatedInteractionMonth[]=[]){
 const month=range.from.slice(0,7),expected=monthRange(month);
 const monthly=range.from===expected.from&&range.to===expected.to;
 const entry=counts.find(c=>c.post_id===postId&&c.mes===month);
 if(monthly&&entry)return {interactions:entry.interacciones,rate:entry.interacciones>0?orders/entry.interacciones*100:null};
 const months:string[]=[];let next=month;
 while(next<=range.to.slice(0,7)&&months.length<14){months.push(next);const [y,m]=next.split('-').map(Number);next=new Date(Date.UTC(y,m,1,17)).toISOString().slice(0,7);}
 const groups=months.map(m=>daily.find(g=>g.mes===m));
 if(groups.length&&groups.every(g=>g&&g.sin_fecha===0)){
  const interactions=groups.reduce((sum,g)=>sum+g!.rows.filter(r=>r.post_id===postId&&r.fecha>=range.from&&r.fecha<=range.to).reduce((n,r)=>n+r.interacciones,0),0);
  return {interactions,rate:interactions>0?orders/interactions*100:null};
 }
 // Monthly denominators cannot be used for a few arbitrarily selected days.
 return {interactions:null,rate:null};
}
