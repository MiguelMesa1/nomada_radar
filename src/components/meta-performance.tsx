import type {CatalogPost} from '@/lib/types';
import {number} from '@/lib/analytics';
import {MetaCosts} from './meta-costs';
import styles from './meta-performance.module.css';

export function MetaPerformance({post,range,missingLabel='Sin dato'}:{post:CatalogPost;range:{from:string;to:string};missingLabel?:string}){
 const value=(metric:number|null|undefined)=>metric===null||metric===undefined?missingLabel:number(metric);
 const frequency=post.meta?.frequency;
 return <section className={`card ${styles.panel}`} aria-label="Rendimiento en Meta">
  <header className={styles.heading}><h3>Rendimiento en Meta</h3><span className={styles.badge}>META ADS</span></header>
  <p className={styles.period}>{range.from.split('-').reverse().join('/')} — {range.to.split('-').reverse().join('/')}</p>
  <dl className={styles.metrics}>
   <div className={styles.frequency}><dt>Frecuencia<small>Veces por persona</small></dt><dd>{frequency===null||frequency===undefined?missingLabel:number(frequency)+'×'}</dd></div>
   <div className={styles.metric}><dt>Impresiones</dt><dd>{value(post.meta?.impressions)}</dd></div>
   <div className={styles.metric}><dt>Alcance</dt><dd>{value(post.meta?.reach)}</dd></div>
  </dl>
  <MetaCosts post={post} layout="cards" missingLabel={missingLabel}/>
  <p className={styles.footnote}>Cifras reportadas por Meta para el periodo seleccionado.</p>
 </section>;
}
