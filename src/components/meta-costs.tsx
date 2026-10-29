import type {CatalogPost} from '@/lib/types';
import {formatMetaCost} from '@/lib/meta-ad-data';
import styles from './meta-performance.module.css';
export function MetaCosts({post,layout='rows',missingLabel='Sin dato'}:{post:CatalogPost;layout?:'rows'|'cards';missingLabel?:string}){
 const rows=[['Gasto total',post.meta?.spend],['Costo por clic (CPC)',post.meta?.cpc],['Costo por mil impresiones (CPM)',post.meta?.cpm]] as const;
 const amount=(value:number|null|undefined)=>value==null?missingLabel:formatMetaCost(value,post.meta?.currency);
 if(layout==='cards')return <dl className={styles.costs}>{rows.map(([label,value],index)=><div className={index===0?styles.totalCost:undefined} key={label}><dt>{index===1?'Costo por clic':index===2?'Por 1.000 impresiones':label}{index>0&&<small>{index===1?'CPC · todos los clics':'CPM'}</small>}</dt><dd>{amount(value)}</dd></div>)}</dl>;
 return <dl className="meta-costs">{rows.map(([label,value])=><div className="info-row" key={label}><dt>{label}</dt><dd>{amount(value)}</dd></div>)}</dl>;
}
