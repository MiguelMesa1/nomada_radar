import {canonicalLine,isMissingLine} from './classification';
import type {CatalogPost} from './types';

export function buildLineAssignment(target:CatalogPost,catalog:CatalogPost[],input:unknown,today:string){
 const line=canonicalLine(input),id=target.post_id.trim().toUpperCase();
 if(isMissingLine(line)||line.length>120)throw Error('Selecciona o escribe una línea válida.');
 if(!id||id.length>100)throw Error('El Post ID no es válido.');
 const existing=catalog.find(post=>post.post_id===id),source=existing??target;
 const post:CatalogPost={post_id:id,producto:line,nombre_creativo:source.nombre_creativo?.trim()||id,campana:source.campana??'',plataforma:source.plataforma??'Otra',activo:source.activo??true,fecha_inicio:source.fecha_inicio||today};
 if(source.publicacion_url!==undefined)post.publicacion_url=source.publicacion_url;
 return {method:existing?'PATCH':'POST',post} as const;
}
