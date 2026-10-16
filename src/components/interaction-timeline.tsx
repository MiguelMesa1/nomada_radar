'use client';
import {useEffect,useRef} from 'react';
import {CalendarDays,MousePointerClick} from 'lucide-react';
import {number} from '@/lib/analytics';
import type {interactionTimeline} from '@/lib/interaction-timeline';

export function InteractionTimeline({days,onDay}:{days:ReturnType<typeof interactionTimeline>;onDay:(day:string)=>void}){
 const bars=useRef<HTMLDivElement>(null),firstDay=days?.[0]?.day,lastDay=days?.at(-1)?.day;
 useEffect(()=>{if(bars.current)bars.current.scrollLeft=bars.current.scrollWidth},[firstDay,lastDay]);
 if(!days)return <section className="card panel daily-interactions-unavailable"><CalendarDays size={18}/><div><h2>Interacciones por día</h2><p className="muted small">Aún faltan fechas para mostrar la evolución diaria completa de este periodo. Puedes consultar las ventas por día con el calendario.</p></div></section>;
 const max=Math.max(...days.map(day=>day.interactions),1),total=days.reduce((sum,day)=>sum+day.interactions,0);
 return <section className="card panel daily-interactions"><div className="panel-heading"><div><h2>Interacciones por día</h2><p className="muted small">Solo interacciones con fecha registrada, según los filtros actuales.</p></div><span className="daily-interactions-total"><b>{number(total)}</b> con fecha</span></div><div ref={bars} className="daily-interaction-bars" role="group" aria-label="Explorar interacciones por día">{days.map(day=><button key={day.day} aria-label={`Ver interacciones del ${day.day}: ${number(day.interactions)}`} onClick={()=>onDay(day.day)}><b>{number(day.interactions)}</b><span className="daily-interaction-bar"><i style={{height:day.interactions/max*100+'%'}}/></span><small>{day.label}</small></button>)}</div><p className="daily-chart-hint"><MousePointerClick size={13}/>Selecciona un día para ver sus Post ID, interacciones y ventas. Desliza para ver otras fechas.</p></section>;
}
