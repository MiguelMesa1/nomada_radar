'use client';
import {publicationLink} from '@/lib/publication-link';
import type {CatalogPost} from '@/lib/types';

export function PublicationLinks({post}:{post?:CatalogPost|null}){
 const networks=new Set<string>();
 const urls=[post?.publicacion_url,post?.meta?.facebookUrl,post?.meta?.instagramUrl].filter(url=>{const link=publicationLink(url);if(!link||networks.has(link.network))return false;networks.add(link.network);return true});
 return <>{urls.map(url=><PublicationLink key={url} url={url}/>)}</>;
}

export function PublicationLink({url}:{url?:string|null}){
 const publication=publicationLink(url);
 if(!publication)return null;
 const label=`Ver publicación en ${publication.network} (abre en otra pestaña)`;
 return <a className="publication-link" href={publication.url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()}>
  {publication.network==='Facebook'?<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 22v-9h3l.5-4H14V6.5c0-1.1.3-1.5 1.6-1.5H18V1.4A28 28 0 0 0 14.7 1C11.4 1 10 3 10 6v3H7v4h3v9z"/></svg>:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>}
 </a>;
}
