import {shiftDay} from './report-period';
import type {DatedInteractionMonth} from './dated-interactions';

export function interactionTimeline(groups:DatedInteractionMonth[],range:{from:string;to:string},postIds:Set<string>){
 const months=new Set<string>(),days:string[]=[];
 for(let day=range.from;day<=range.to&&days.length<366;day=shiftDay(day,1)){days.push(day);months.add(day.slice(0,7));}
 // Missing dates cannot be distributed among days or treated as zero.
 if(!days.length||[...months].some(month=>!groups.some(group=>group.mes===month&&group.sin_fecha===0)))return null;
 const counts=new Map<string,number>();
 for(const group of groups)for(const row of group.rows)if(postIds.has(row.post_id)&&row.fecha>=range.from&&row.fecha<=range.to)counts.set(row.fecha,(counts.get(row.fecha)??0)+row.interacciones);
 const formatter=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',timeZone:'America/Bogota'});
 return days.map(day=>({day,label:formatter.format(new Date(day+'T12:00:00-05:00')),interactions:counts.get(day)??0}));
}
