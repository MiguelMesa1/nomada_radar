'use client';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {colombiaDay} from '@/lib/analytics';
import {shiftDay,shiftMonth} from '@/lib/report-period';

export function ReportPeriodPicker({range,mode,onMonth,onDay}:{range:{from:string;to:string};mode:string;onMonth:(value:string)=>void;onDay:(value:string)=>void}){
 const today=colombiaDay(new Date()),daily=mode==='Día';
 return <div className="report-period-picker">
  <div className="segments period-modes" role="group" aria-label="Ver informe por"><button aria-pressed={!daily&&mode==='Mes'} className={!daily&&mode==='Mes'?'active':''} onClick={()=>onMonth(range.from.slice(0,7))}>Mes</button><button aria-pressed={daily} className={daily?'active':''} onClick={()=>onDay(range.from.slice(0,7)===today.slice(0,7)?today:range.to)}>Día</button></div>
  <div className="month-picker"><button className="icon-button" aria-label={daily?'Día anterior':'Mes anterior'} onClick={()=>daily?onDay(shiftDay(range.from,-1)):onMonth(shiftMonth(range.from.slice(0,7),-1))}><ChevronLeft size={16}/></button><label>{daily?'Día del informe':'Mes del informe'}<input type={daily?'date':'month'} aria-label={daily?'Día del informe':'Mes del informe'} value={daily?range.from:range.from.slice(0,7)} onChange={e=>{if(e.target.validity.valid&&e.target.value)(daily?onDay:onMonth)(e.target.value)}}/></label><button className="icon-button" aria-label={daily?'Día siguiente':'Mes siguiente'} onClick={()=>daily?onDay(shiftDay(range.from,1)):onMonth(shiftMonth(range.from.slice(0,7),1))}><ChevronRight size={16}/></button></div>
  <button className="button outline small" onClick={()=>daily?onDay(today):onMonth(today.slice(0,7))}>{daily?<><CalendarDays size={14}/>Hoy</>:'Mes actual'}</button>
 </div>;
}
