'use client';
import {useState} from 'react';
import {Search} from 'lucide-react';
import {normalize,number} from '@/lib/analytics';
import type {PostMetric} from '@/lib/types';

export function LocationPostPicker({posts,selected,onSelect,total}:{posts:PostMetric[];selected:string;onSelect:(id:string)=>void;total:number}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(1);
 const matches=posts.filter(p=>normalize(`${p.post_id} ${p.nombre_creativo}`).includes(normalize(query)));
 const pages=Math.max(1,Math.ceil(matches.length/8)),currentPage=Math.min(page,pages);
 const active=posts.find(p=>p.post_id===selected);
 return <>
  <div className="geo-picker-toolbar"><label className="search"><Search size={17}/><input aria-label="Buscar Post ID en ubicaciones" placeholder="Buscar por Post ID o nombre" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><button className={'pill '+(!selected?'active':'')} aria-pressed={!selected} onClick={()=>onSelect('')}>Todos los Post ID · {number(total)} ventas</button></div>
  {active&&<p className="geo-selection">Publicación seleccionada: <b>{active.post_id}</b> · {number(active.orders)} ventas <button className="text-link" onClick={()=>onSelect('')}>Quitar selección</button></p>}
  <div className="geo-post-grid" role="group" aria-label="Post IDs de la línea">{matches.slice((currentPage-1)*8,currentPage*8).map(p=><button key={p.post_id} className={'geo-post-card '+(selected===p.post_id?'active':'')} aria-pressed={selected===p.post_id} onClick={()=>onSelect(p.post_id)}><b>{p.post_id}</b><small>{p.nombre_creativo===p.post_id?'Sin nombre corto':p.nombre_creativo}</small><span>{number(p.orders)} ventas</span></button>)}</div>
  {!matches.length&&<p className="muted small">No hay publicaciones que coincidan con la búsqueda.</p>}
  <div className="geo-pagination"><span>{number(matches.length)} publicaciones · Página {currentPage} de {pages}</span><div><button className="button outline small" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Anterior</button><button className="button outline small" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Siguiente</button></div></div>
 </>;
}
