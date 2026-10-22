import type { InteractionCount } from './types';
import { monthRange } from './report-period';
import type {DatedInteractionMonth} from './dated-interactions';
export function conversionForPost(postId:string,orders:number,counts:InteractionCount[],range:{from:string;to:string},daily:DatedInteractionMonth[]=[]){
 const months:string[]=[];let next=range.from.slice(0,7);
 while(next<=range.to.slice(0,7)&&months.length<14){months.push(next);const [y,m]=next.split('-').map(Number);next=new Date(Date.UTC(y,m,1,17)).toISOString().slice(0,7);}
 if(!months.length||next<=range.to.slice(0,7)||range.from>range.to)return {interactions:null,rate:null};
 let interactions=0;
 for(const month of months){
  const expected=monthRange(month),[year,m]=month.split('-').map(Number);
  const monthEnd=new Date(Date.UTC(year,m,0,17)).toISOString().slice(0,10);
  const from=range.from>expected.from?range.from:expected.from,to=range.to<monthEnd?range.to:monthEnd;
  const monthly=counts.find(c=>c.post_id===postId&&c.mes===month);
  if(from===expected.from&&to===expected.to&&monthly){interactions+=monthly.interacciones;continue;}
  const dated=daily.find(group=>group.mes===month);
  // Partial months need dated counts. Monthly totals must never be prorated.
  if(!dated||dated.sin_fecha!==0)return {interactions:null,rate:null};
  interactions+=dated.rows.filter(row=>row.post_id===postId&&row.fecha>=from&&row.fecha<=to).reduce((sum,row)=>sum+row.interacciones,0);
 }
 return {interactions,rate:interactions>0?orders/interactions*100:null};
}
