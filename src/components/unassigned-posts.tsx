'use client';
import {useMemo,useState} from 'react';
import {ExternalLink,Search,Tags} from 'lucide-react';
import {normalize,number} from '@/lib/analytics';
import {unassignedPostLinks} from '@/lib/unassigned-posts';
import type {CatalogPost} from '@/lib/types';
import styles from './unassigned-posts.module.css';

export function UnassignedPosts({posts,loadingMeta,onAssign}:{posts:CatalogPost[];loadingMeta?:boolean;onAssign?:(post:CatalogPost)=>void}){
 const [query,setQuery]=useState(''),[requestedPage,setPage]=useState(0);
 const filtered=useMemo(()=>{const q=normalize(query);return posts.filter(post=>!q||normalize(post.post_id+' '+post.nombre_creativo).includes(q))},[posts,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/12)),page=Math.min(requestedPage,pages-1);
 return <section className={`card panel ${styles.panel}`} id="post-ids-sin-linea" aria-labelledby="unassigned-posts-heading">
  <div className={styles.heading}><div><h2 id="unassigned-posts-heading">Post IDs sin línea</h2><p className="muted small">{number(posts.length)} pendientes de asignar · solo IDs con conteo de interacciones mayor que cero en Excel.</p></div><Tags size={22} aria-hidden="true"/></div>
  {loadingMeta&&<p className="muted small" role="status">Consultando anuncios y enlaces de Meta…</p>}
  {!!posts.length&&<label className={`search ${styles.search}`}><Search size={17} aria-hidden="true"/><input aria-label="Buscar Post IDs sin línea" placeholder="Busca un ID o nombre de anuncio" value={query} onChange={event=>{setQuery(event.target.value);setPage(0)}}/></label>}
  <ul className={styles.list}>{filtered.slice(page*12,page*12+12).map(post=>{
   const links=unassignedPostLinks(post);
   return <li key={post.post_id} className={styles.row}><div className={styles.identity}><strong>{post.post_id}</strong>{post.nombre_creativo!==post.post_id&&<span>{post.nombre_creativo}</span>}{!post.activo&&<small>Inactivo</small>}</div><div className={styles.links}>{links.map(link=><a key={link.network} className="text-link" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver anuncio de ${post.post_id} en ${link.network}`}><ExternalLink size={14} aria-hidden="true"/>Ver anuncio en {link.network}</a>)}{!links.length&&<span className="muted small">Enlace del anuncio no disponible</span>}</div>{onAssign&&<button type="button" className="button outline small" aria-label={`Asignar línea pendiente al Post ID ${post.post_id}`} onClick={()=>onAssign(post)}><Tags size={14} aria-hidden="true"/>Asignar línea</button>}</li>;
  })}</ul>
  {!filtered.length&&<p className="muted small">{posts.length?'No hay pendientes que coincidan con la búsqueda.':'No hay Post IDs sin línea con conteo de interacciones en Excel.'}</p>}
  {pages>1&&<nav className={styles.pagination} aria-label="Páginas de Post IDs sin línea"><span>{page*12+1}–{Math.min((page+1)*12,filtered.length)} de {number(filtered.length)}</span><button type="button" className="button small" disabled={!page} onClick={()=>setPage(page-1)}>Anterior</button><button type="button" className="button small" disabled={page+1===pages} onClick={()=>setPage(page+1)}>Siguiente</button></nav>}
 </section>;
}
