import Image from 'next/image';
import {ArrowUpRight,BarChart3,LoaderCircle,MoreHorizontal} from 'lucide-react';
import {reportNavigation} from './navigation';

export function ReportSkeleton({view='inicio'}:{view?:string}){
 const table=['post-id','interacciones','conversion','catalogo','administracion'].includes(view);
 return <div className="report-skeleton" aria-hidden="true">
  <div className="skeleton-stats">{Array.from({length:4},(_,i)=><div className="card skeleton-stat" key={i}><span className="skeleton-block skeleton-label"/><span className="skeleton-block skeleton-value"/><span className="skeleton-block skeleton-caption"/></div>)}</div>
  {table?<div className="card skeleton-table"><div className="skeleton-table-head"/>{Array.from({length:6},(_,i)=><div className="skeleton-table-row" key={i}>{Array.from({length:4},(_,j)=><span className="skeleton-block" key={j}/>)}</div>)}</div>:<div className="skeleton-panels"><div className="card skeleton-chart"><span className="skeleton-block skeleton-label"/><div className="skeleton-bars">{[32,54,38,72,62,88,70,95,80,64,85,100].map((height,i)=><span key={i} style={{height:height+'%'}}/>)}</div></div><div className="card skeleton-ranking"><span className="skeleton-block skeleton-label"/>{Array.from({length:5},(_,i)=><div key={i}><span className="skeleton-block skeleton-dot"/><span className="skeleton-block"/><span className="skeleton-block skeleton-short"/></div>)}</div></div>}
 </div>;
}

export function DashboardLoading({view='inicio',title='Preparando tu informe'}:{view?:string;title?:string}){
 return <div className="loading-workspace">
  <aside className="sidebar loading-shell" aria-hidden="true"><div className="brand"><div className="logo-crop"><Image src="/brand/nomada.png" width={5867} height={2172} sizes="200px" alt="" loading="eager"/></div><small>RADAR · ANALÍTICA</small></div><nav>{reportNavigation.map(({id,name,icon:Icon})=><span className={`nav-item ${id===view?'active':''}`} key={id}><Icon/>{name}</span>)}</nav><div className="loading-sidebar-note"><span className="dot"/>Tus ventas, más claras.</div></aside>
  <header className="mobile-header" aria-hidden="true"><div className="mobile-brand"><div className="mamut-crop"><Image src="/brand/mamut.png" width={5016} height={1623} sizes="128px" alt="" loading="eager"/></div><span>NÓMADA<small>RADAR</small></span></div><span className="mobile-status"><span className="dot"/>Cargando</span></header>
  <main className="loading-main"><div className="loading-title-row" aria-hidden="true"><div><span className="eyebrow">NÓMADA RADAR</span><h1 className="display">Tus datos, en camino.</h1></div><BarChart3 size={26}/></div>
   <div className="loading-message" role="status" aria-live="polite"><div className="loading-orbit"><Image src="/icon.png" width={40} height={40} alt=""/></div><div><b>{title}</b><p>Estamos organizando tus ventas y publicaciones.</p></div><span className="loading-dots" aria-hidden="true"><i/><i/><i/></span></div>
   <ReportSkeleton view={view}/><p className="loading-footer"><ArrowUpRight size={13}/>Información lista para tomar mejores decisiones.</p>
  </main><div className="mobile-nav loading-mobile-nav" aria-hidden="true">{reportNavigation.slice(0,3).map(({id,name,icon:Icon})=><span key={id} className={id===view?'active':''}><Icon/>{name}</span>)}<span className={reportNavigation.slice(3).some(item=>item.id===view)?'active':''}><MoreHorizontal/>Más</span></div>
 </div>;
}

export function UpdateStatus({phase}:{phase:'sync'|'report'}){
 return <div className="update-status" role="status" aria-live="polite"><LoaderCircle size={19} className="spin" aria-hidden="true"/><div><b>{phase==='sync'?'Actualizando tus ventas':'Preparando el informe'}</b><span>{phase==='sync'?'Consultando los últimos datos de tu hoja.':'Organizando las cifras del periodo seleccionado.'}</span></div><div className="update-track" aria-hidden="true"><span/></div></div>;
}

export function ChartSkeleton(){return <div className="chart chart-skeleton" role="status" aria-label="Cargando gráfico"><div className="skeleton-bars" aria-hidden="true">{[35,58,42,76,60,88,70,95].map((h,i)=><span key={i} style={{height:h+'%'}}/>)}</div></div>}
