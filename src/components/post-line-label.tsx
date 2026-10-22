'use client';
import {Plus} from 'lucide-react';
import {postLine,isMissingLine} from '@/lib/classification';
import {isOtherCatalogLine} from '@/lib/catalog-filter';
import type {CatalogPost,Sale} from '@/lib/types';

export function PostLineLabel({post,sales=[],onAssign}:{post:CatalogPost;sales?:Sale[];onAssign?:(post:CatalogPost)=>void}){
 const line=postLine(post,sales);
 return <span className="post-line-label"><span>{line}</span>{(isMissingLine(line)||isOtherCatalogLine(line))&&onAssign&&<button type="button" className="assign-line-button" aria-label={`Asignar línea al Post ID ${post.post_id}`} onKeyDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onAssign(post)}}><Plus size={12} aria-hidden="true"/>Asignar línea</button>}</span>;
}
