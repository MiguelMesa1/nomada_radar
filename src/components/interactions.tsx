'use client';
import {useMemo,useState} from 'react';
import {ArrowUpRight,Hash,MessageCircle,Search,ShoppingBag,Tags,Target,Trophy} from 'lucide-react';
import {number,percent} from '@/lib/analytics';
import {postLine} from '@/lib/classification';
import {filterInteractions,summarizeInteractions,type InteractionRow} from '@/lib/interactions-report';
import type {PostMetric,Sale,CatalogPost} from '@/lib/types';
import {PostLineLabel} from './post-line-label';
import {InteractionLeaders} from './interaction-leaders';
import {InteractionTimeline} from './interaction-timeline';
import {interactionTimeline} from '@/lib/interaction-timeline';
import type {DatedInteractionMonth} from '@/lib/dated-interactions';

export function Interactions({rows,sales,range,daily,query,line,sort,onDay,onQuery,onLine,onSort,onSelect,onAssign}:{rows:InteractionRow[];sales:Sale[];range:{from:string;to:string};daily:DatedInteractionMonth[];onDay:(day:string)=>void;query:string;line:string;sort:string;onQuery:(value:string)=>void;onLine:(value:string)=>void;onSort:(value:string)=>void;onSelect:(post:PostMetric)=>void;onAssign?:(post:CatalogPost)=>void}){
 const [page,setPage]=useState(0);
 const filtered=useMemo(()=>filterInteractions(rows,sales,query,line,sort),[rows,sales,query,line,sort]);
 const summary=useMemo(()=>summarizeInteractions(filtered,sales),[filtered,sales]);
 const timeline=useMemo(()=>interactionTimeline(daily,range,new Set(filtered.map(row=>row.post.post_id))),[daily,range,filtered]);
 const lines=useMemo(()=>[...new Set(rows.map(row=>postLine(row.post,sales)))].sort(),[rows,sales]);
 const ranking=useMemo(()=>filtered.filter(row=>row.interactions!>0).sort((a,b)=>b.interactions!-a.interactions!),[filtered]);
 const lastPage=Math.max(0,Math.ceil(filtered.length/10)-1),currentPage=Math.min(page,lastPage),visible=filtered.slice(currentPage*10,currentPage*10+10);
 const cards=[
  {label:'Interacciones recibidas',value:rows.length?number(summary.total):'—',note:'En el periodo y filtros seleccionados',icon:MessageCircle},
  {label:'Post ID con actividad',value:rows.length?number(summary.active):'—',note:'Con al menos una interacción',icon:Hash},
  {label:'Ventas con interacciones',value:rows.length?number(summary.orders):'—',note:'Solo ID con un conteo mayor que cero',icon:ShoppingBag},
  {label:'Conversión a ventas',value:summary.rate===null?'—':percent(summary.rate),note:'Ventas ÷ interacciones de esos mismos ID',icon:Target},
 ];
 const choose=(row:InteractionRow)=>onSelect(row.post);
 return <div className="interactions-report">
  <div className="toolbar"><label className="search"><Search size={18}/><input aria-label="Buscar interacciones" placeholder="Busca por Post ID o línea" value={query} onChange={e=>{onQuery(e.target.value);setPage(0)}}/></label><select aria-label="Filtrar interacciones por línea" value={line} onChange={e=>{onLine(e.target.value);setPage(0)}}><option value="">Todas las líneas</option>{lines.map(name=><option key={name}>{name}</option>)}</select><select aria-label="Ordenar interacciones" value={sort} onChange={e=>{onSort(e.target.value);setPage(0)}}><option value="interactions">Más interacciones</option><option value="conversion">Mayor conversión</option><option value="orders">Más ventas</option></select></div>
  <div className="interaction-kpis">{cards.map(({label,value,note,icon:Icon})=><section className="card kpi" key={label}><div className="kpi-top"><div className="kpi-label">{label}</div><span className="kpi-icon"><Icon size={16}/></span></div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></section>)}</div>
  {range.from!==range.to&&<InteractionTimeline days={timeline} onDay={onDay}/>}
  {!rows.length?<section className="card interactions-no-data"><MessageCircle size={30}/><h2>Sin interacciones disponibles</h2><p>No hay conteos para estas fechas. Prueba un mes completo u otro periodo.</p><p className="muted small">Los conteos mensuales se usan para su mes. Para consultar días específicos, las interacciones necesitan fecha.</p></section>:!filtered.length?<section className="card interactions-no-data"><Search size={28}/><h2>No hay coincidencias</h2><p>Cambia la búsqueda o selecciona otra línea.</p></section>:<>
   <div className="interaction-insights"><section className="card"><Trophy size={18}/><span>Post ID más consultado</span><button className="text-link" disabled={!summary.leader} onClick={()=>summary.leader&&choose(summary.leader)}>{summary.leader?.post.post_id??'Sin actividad'}</button><small>{summary.leader?number(summary.leader.interactions!)+' interacciones':'No se registraron interacciones'}</small></section><section className="card"><ShoppingBag size={18}/><span>Post ID con ventas</span><b>{number(summary.sellingPosts)}</b><small>De {number(summary.active)} publicaciones que recibieron interacciones</small></section><section className="card"><Tags size={18}/><span>Línea más consultada</span><b>{summary.lines[0]?.name??'Sin actividad'}</b><small>{summary.lines[0]?number(summary.lines[0].interactions)+' interacciones':'Sin interacciones en este periodo'}</small></section></div>
   <div className="interaction-panels"><InteractionLeaders rows={ranking} sales={sales} onSelect={onSelect}/><section className="card panel interactions-lines"><h2>Interacciones por línea</h2><p className="muted small">Selecciona una línea para explorar sus publicaciones.</p>{summary.lines.slice(0,6).map(group=><button key={group.name} onClick={()=>{onLine(group.name);setPage(0)}}><span><b>{group.name}</b><small>{number(group.orders)} ventas · {percent(group.orders/group.interactions*100)} conversión</small><span className="bar-track yellow"><span style={{width:group.interactions/(summary.lines[0]?.interactions||1)*100+'%'}}/></span></span><strong>{number(group.interactions)}<small>{percent(group.interactions/summary.total*100)}</small></strong></button>)}{!summary.lines.length&&<p className="muted">No hay líneas con actividad en esta selección.</p>}</section></div>
   <div className="panel-heading"><div><h2>Rendimiento por Post ID</h2><p className="muted small">{number(filtered.length)} publicaciones con conteo disponible · selecciona un ID para ver sus ventas y ciudades.</p></div></div>
   <div className="table-wrap interactions-table"><table><thead><tr>{['Post ID','Línea','Interacciones','Participación','Ventas','Conversión'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.post.post_id}><td><button className="text-link" onClick={()=>choose(row)}>{row.post.post_id}<ArrowUpRight size={13}/></button>{row.post.nombre_creativo!==row.post.post_id&&<small>{row.post.nombre_creativo}</small>}</td><td><PostLineLabel post={row.post} sales={sales} onAssign={onAssign}/></td><td><b>{number(row.interactions!)}</b></td><td>{summary.total?percent(row.interactions!/summary.total*100):'—'}</td><td>{number(row.post.orders)}</td><td>{row.rate===null?'—':percent(row.rate)}</td></tr>)}</tbody></table></div>
   <div className="interactions-mobile">{visible.map(row=><article className="card" key={row.post.post_id}><div><button type="button" className="text-link post-card-open" onClick={()=>choose(row)}>{row.post.post_id}</button><ArrowUpRight size={16}/></div><div className="mobile-line-label"><PostLineLabel post={row.post} sales={sales} onAssign={onAssign}/></div><div className="interactions-mobile-stats"><span><b>{number(row.interactions!)}</b><small>Interacciones</small></span><span><b>{number(row.post.orders)}</b><small>Ventas</small></span><span><b>{row.rate===null?'—':percent(row.rate)}</b><small>Conversión</small></span></div></article>)}</div>
   <nav className="interaction-pagination" aria-label="Páginas de interacciones"><span>{currentPage*10+1}–{Math.min((currentPage+1)*10,filtered.length)} de {number(filtered.length)} Post ID</span><button className="button outline small" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Anterior</button><button className="button outline small" disabled={currentPage===lastPage} onClick={()=>setPage(currentPage+1)}>Siguiente</button></nav>
  </>}
  <p className="conversion-note">La conversión compara ventas e interacciones de los mismos Post ID y fechas; no representa clientes únicos ni atribución individual. Puede superar el 100 % si un ID tiene más ventas que interacciones registradas. Los ID sin conteo o con cero interacciones no suman ventas al cálculo de conversión.{summary.salesWithoutInteractions>0?` Hay ${number(summary.salesWithoutInteractions)} ventas en ID con cero interacciones registradas.`:''}</p>
 </div>;
}
