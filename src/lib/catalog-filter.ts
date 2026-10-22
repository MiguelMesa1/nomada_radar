import {normalize} from './analytics';
import {canonicalLine,isMissingLine} from './classification';
import type {CatalogPost,Sale} from './types';

export function isOtherCatalogLine(value:unknown){return ['otra marca','otra linea','otra','otros','otras'].includes(normalize(value));}
export function catalogLineOptions(catalog:CatalogPost[]){
 const options=new Map<string,string>();
 for(const post of catalog){const line=canonicalLine(post.producto);if(!isMissingLine(line)&&!isOtherCatalogLine(line))options.set(normalize(line),line);}
 return [...options].sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([key,name])=>({value:`line:${key}`,name}));
}
export function filterCatalog<T extends CatalogPost>(catalog:T[],query='',status='Todos',line='',sales:Sale[]=[]){
 const q=normalize(query);
 const salesLines=new Map<string,Set<string>>();
 for(const sale of sales)if(sale.post_id){const lines=salesLines.get(sale.post_id)??new Set<string>();lines.add(normalize(canonicalLine(sale.linea)));salesLines.set(sale.post_id,lines);}
 const requested=line==='other'?'otra marca':line.startsWith('line:')?line.slice(5):'';
 return catalog.filter(post=>{
  const assigned=canonicalLine(post.producto);
  const imported=salesLines.get(post.post_id);
  return (!q||normalize(`${post.post_id} ${post.nombre_creativo} ${assigned} ${[...imported??[]].join(' ')}`).includes(q))
   &&(status==='Todos'||status==='Activos'&&post.activo||status==='Inactivos'&&!post.activo)
   &&(!line||(line==='missing'?isMissingLine(assigned):requested!==''&&(normalize(assigned)===requested||!!imported?.has(requested))));
 });
}
