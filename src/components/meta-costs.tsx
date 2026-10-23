import type {CatalogPost} from '@/lib/types';
import {formatMetaCost} from '@/lib/meta-ad-data';
export function MetaCosts({post}:{post:CatalogPost}){
 const rows=[['Gasto total',post.meta?.spend],['Costo por clic (CPC)',post.meta?.cpc],['Costo por mil impresiones (CPM)',post.meta?.cpm]] as const;
 return <dl className="meta-costs">{rows.map(([label,value])=><div className="info-row" key={label}><dt>{label}</dt><dd>{formatMetaCost(value,post.meta?.currency)}</dd></div>)}</dl>;
}
