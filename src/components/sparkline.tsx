import {colombiaDay,number} from '@/lib/analytics';
import {shiftDay} from '@/lib/report-period';

export function Sparkline({values,large=false,endDate}:{values:number[];large?:boolean;endDate?:string}) {
 const max=Math.max(...values,1);
 if(large){
  const end=endDate??colombiaDay(new Date()),formatter=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Bogota'});
  return <div className="sales-sparkline" role="group" aria-label="Ventas diarias de los últimos 14 días">{values.map((value,index)=>{const day=shiftDay(end,index-values.length+1),label=`${formatter.format(new Date(day+'T12:00:00-05:00'))}: ${number(value)} ${value===1?'venta':'ventas'}`;return <button type="button" key={day} className="sales-spark-column" aria-label={label}><span className="sales-spark-value" style={{bottom:`calc(${value/max*100}% + 5px)`}}>{number(value)}</span><span className="sales-spark-bar" style={{height:`${Math.max(3,value/max*100)}%`,background:index===values.length-1?'var(--yellow)':'var(--spark)'}}/><span className="sales-spark-tooltip" role="tooltip">{label}</span></button>})}</div>;
 }
 return <div className={large?'sparkline large':'sparkline'} aria-label={`${values.reduce((a,b)=>a+b,0)} pedidos en los últimos 14 días`}>{values.map((v,i)=><span key={i} style={{height:`${Math.max(3,v/max*100)}%`,background:i===values.length-1?'#F0E300':'#2b2b2a'}}/>)}</div>;
}
