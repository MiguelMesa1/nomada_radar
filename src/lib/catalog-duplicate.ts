import {canonicalLine,isMissingLine} from './classification';
import type {CatalogPost} from './types';

export function catalogDuplicateMessage(post:Pick<CatalogPost,'post_id'|'producto'>){
 const line=canonicalLine(post.producto);
 return isMissingLine(line)
  ?`El Post ID ${post.post_id} ya se encuentra en el catálogo y todavía no tiene una línea asignada.`
  :`El Post ID ${post.post_id} ya se encuentra en el catálogo y está asignado a la línea ${line}.`;
}
