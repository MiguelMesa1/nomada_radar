import { colombiaDay } from './analytics';
export function monthRange(month=colombiaDay(new Date()).slice(0,7),today=colombiaDay(new Date())){
 if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))throw Error('Mes inválido');
 const [year,m]=month.split('-').map(Number);
 const end=new Date(Date.UTC(year,m,0,17)).toISOString().slice(0,10);
 return {from:`${month}-01`,to:month===today.slice(0,7)?today:end};
}
export function shiftMonth(month:string,delta:number){const [year,m]=month.split('-').map(Number);return new Date(Date.UTC(year,m-1+delta,15,17)).toISOString().slice(0,7);}
export function dayRange(day=colombiaDay(new Date())){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00-05:00'))||colombiaDay(new Date(day+'T12:00:00-05:00'))!==day)throw Error('Día inválido');
 return {from:day,to:day};
}
export function shiftDay(day:string,delta:number){const value=new Date(dayRange(day).from+'T12:00:00-05:00');value.setUTCDate(value.getUTCDate()+delta);return colombiaDay(value);}
export function periodLabel(from:string,to:string){
 if(from===to)return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Bogota'}).format(new Date(from+'T12:00:00-05:00'));
 if(from.endsWith('-01')&&from.slice(0,7)===to.slice(0,7))return new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:'America/Bogota'}).format(new Date(from+'T12:00:00-05:00'));
 return `${from} al ${to}`;
}
