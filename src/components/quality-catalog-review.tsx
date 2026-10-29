'use client';
import {useState,type FormEvent} from 'react';
import {Modal} from './ui/dialog';
import {PublicationLinks} from './publication-link';
import {CopyPostId} from './copy-post-id';
import {buildLineAssignment} from '@/lib/line-assignment';
import {metaPreviewURL} from '@/lib/meta-ad-data';
import {preparedLines} from '@/lib/classification';
import {normalize,number} from '@/lib/analytics';
import type {CatalogPost} from '@/lib/types';
import type {UnknownCatalogPost} from '@/lib/quality-review';

export function QualityCatalogReview({open,onClose,entries,lines,today,onSave,metaLoading,onRetryMeta}:{open:boolean;onClose:()=>void;entries:UnknownCatalogPost[];lines:string[];today:string;onSave:(post:CatalogPost)=>Promise<void>;metaLoading:boolean;onRetryMeta:()=>void}){
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const filtered=entries.filter(row=>normalize(row.post.post_id+' '+row.post.nombre_creativo+' '+row.suggestedLine).includes(normalize(query)));
 const current=filtered.find(row=>row.post.post_id===selected)??filtered[0];
 const preview=metaPreviewURL(current?.post.meta?.thumbnailUrl);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!current||saving)return;setError('');setNotice('');
  try{
   const assignment=buildLineAssignment(current.post,[],new FormData(event.currentTarget).get('producto'),today);
   if(assignment.post.producto==='Otra marca')throw Error('Elige la línea del anuncio para completar su clasificación.');
   const link=current.post.meta?.facebookUrl??current.post.meta?.instagramUrl;
   if(link)assignment.post.publicacion_url=link;
   setSaving(true);await onSave(assignment.post);setSelected('');setNotice('Post ID '+assignment.post.post_id+' guardado. Puedes continuar con el siguiente.');
  }catch(error){setError(error instanceof Error?error.message:'No pudimos guardar. Intenta de nuevo.');}finally{setSaving(false);}
 }
 return <Modal open={open} onClose={()=>{if(!saving)onClose()}} wide title="Revisar Post IDs" description="Identifica cada anuncio y asigna su línea. Al guardar, sus ventas se actualizan en Radar.">
  {notice&&<p className="notice" role="status">{notice}</p>}
  {entries.length?<div className="quality-review-layout">
   <aside className="quality-review-list"><label className="form">Buscar anuncio<input aria-label="Buscar anuncio pendiente" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Post ID o nombre" disabled={saving}/></label><p className="muted small">{number(filtered.length)} pendientes · Más ventas primero</p><div className="quality-review-queue">{filtered.slice(0,30).map(row=><button type="button" key={row.post.post_id} aria-pressed={current?.post.post_id===row.post.post_id} disabled={saving} onClick={()=>{setSelected(row.post.post_id);setError('');setNotice('');}}><b>{row.post.nombre_creativo}</b><span>{row.post.post_id}</span><small>{number(row.orders)} {row.orders===1?'venta':'ventas'}</small></button>)}</div>{filtered.length>30&&<p className="muted small">Busca por ID o nombre para encontrar más anuncios.</p>}</aside>
   {current?<section className="quality-review-detail" aria-label="Anuncio por clasificar">
    <h3>{current.post.nombre_creativo}</h3><div className="post-id-actions"><span className="post-id-value">{current.post.post_id}</span><CopyPostId id={current.post.post_id}/></div>
    {preview?<img key={preview} className="quality-ad-preview" src={preview} alt={'Vista previa de '+current.post.nombre_creativo} width={640} height={360} loading="lazy" referrerPolicy="no-referrer"/>:<div className="quality-ad-placeholder"><p>{metaLoading?'Buscando el anuncio en Meta…':'Vista previa no disponible para este anuncio.'}</p><button type="button" className="button small" disabled={metaLoading} onClick={onRetryMeta}>{metaLoading?'Consultando…':'Buscar en Meta'}</button></div>}
    {(current.post.meta?.facebookUrl||current.post.meta?.instagramUrl)&&<div className="post-id-actions"><span className="small">Abrir anuncio:</span><PublicationLinks post={current.post}/></div>}
    <p className="muted small">{number(current.orders)} ventas en el periodo</p>
    {!!current.summaries.length&&<div className="order-summary"><b>Qué se vendió</b>{current.summaries.map(summary=><p key={summary}>{summary}</p>)}</div>}
    <form key={current.post.post_id} className="form" onSubmit={save}><label>Línea del anuncio<input name="producto" aria-label="Línea del anuncio" required maxLength={120} list="quality-line-options" defaultValue={current.suggestedLine} placeholder="Ej. Pulsar 180" disabled={saving}/><datalist id="quality-line-options">{[...new Set([...preparedLines,...lines])].filter(line=>line!=='Sin línea'&&line!=='Otra marca').map(line=><option key={line} value={line}/>)}</datalist></label>{error&&<p className="form-error" role="alert">{error}</p>}<button type="submit" className="button yellow" disabled={saving}>{saving?'Guardando…':filtered.length>1?'Guardar y siguiente':'Guardar línea'}</button></form>
   </section>:<p className="muted">No hay anuncios que coincidan con la búsqueda.</p>}
  </div>:<div className="empty"><h3>Todo al día</h3><p>No quedan Post IDs sin catálogo en este periodo.</p></div>}
 </Modal>;
}
