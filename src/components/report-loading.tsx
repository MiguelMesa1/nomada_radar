import Image from 'next/image';
import {ArrowUpRight,BarChart3,Hash,LayoutDashboard,LoaderCircle,MapPin,Tags,MousePointerClick} from 'lucide-react';

export function ReportSkeleton({view='inicio'}:{view?:string}){
 const table=['post-id','interacciones','catalogo','administracion'].includes(view);
 return <div className="report-skeleton" aria-hidden="true">
  <div className="skeleton-stats">{Array.from({length:4},(_,i)=><div className="card skeleton-stat" key={i}><span className="skeleton-block skeleton-label"/><span className="skeleton-block skeleton-value"/><span className="skeleton-block skeleton-caption"/></div>)}</div>
  {table?<div className="card skeleton-table"><div className="skeleton-table-head"/>{Array.from({length:6},(_,i)=><div className="skeleton-table-row" key={i}>{Array.from({length:4},(_,j)=><span className="skeleton-block" key={j}/>)}</div>)}</div>:<div className="skeleton-panels"><div className="card skeleton-chart"><span className="skeleton-block skeleton-label"/><div className="skeleton-bars">{[32,54,38,72,62,88,70,95,80,64,85,100].map((height,i)=><span key={i} style={{height:height+'%'}}/>)}</div></div><div className="card skeleton-ranking"><span className="skeleton-block skeleton-label"/>{Array.from({length:5},(_,i)=><div key={i}><span className="skeleton-block skeleton-dot"/><span className="skeleton-block"/><span className="skeleton-block skeleton-short"/></div>)}</div></div>}
 </div>;
}

export function DashboardLoading({view='inicio',title='Preparando tu informe'}:{view?:string;title?:string}){
 const links=[{label:'Inicio',icon:LayoutDashboard},{label:'Post ID',icon:Hash},{label:'Líneas',icon:Tags},{label:'Interacciones',icon:MousePointerClick},{label:'Ubicaciones',icon:MapPin}];
 return <div className="loading-workspace">
  <aside className="loading-sidebar" aria-hidden="true"><div className="loading-logo"><Image src="/brand/nomada.png" width={5867} height={2172} sizes="165px" alt="" loading="eager"/></div><span className="loading-brand-caption">RADAR · ANALÍTICA</span><div className="loading-nav">{links.map(({label,icon:Icon})=><span key={label}><Icon size={18}/>{label}</span>)}</div><div className="loading-sidebar-note"><span className="dot"/>Tus ventas, más claras.</div></aside>
  <main className="loading-main"><div className="loading-title-row" aria-hidden="true"><div><span className="eyebrow">NÓMADA RADAR</span><h1 className="display">Tus datos, en camino.</h1></div><BarChart3 size={26}/></div>
   <div className="loading-message" role="status" aria-live="polite"><div className="loading-orbit"><Image src="/icon.png" width={40} height={40} alt=""/></div><div><b>{title}</b><p>Estamos organizando tus ventas y publicaciones.</p></div><span className="loading-dots" aria-hidden="true"><i/><i/><i/></span></div>
   <ReportSkeleton view={view}/><p className="loading-footer"><ArrowUpRight size={13}/>Información lista para tomar mejores decisiones.</p>
  </main>
 </div>;
}

export function UpdateStatus({phase}:{phase:'sync'|'report'}){
 return <div className="update-status" role="status" aria-live="polite"><LoaderCircle size={19} className="spin" aria-hidden="true"/><div><b>{phase==='sync'?'Actualizando tus ventas':'Preparando el informe'}</b><span>{phase==='sync'?'Consultando los últimos datos de tu hoja.':'Organizando las cifras del periodo seleccionado.'}</span></div><div className="update-track" aria-hidden="true"><span/></div></div>;
}

export function ChartSkeleton(){return <div className="chart chart-skeleton" role="status" aria-label="Cargando gráfico"><div className="skeleton-bars" aria-hidden="true">{[35,58,42,76,60,88,70,95].map((h,i)=><span key={i} style={{height:h+'%'}}/>)}</div></div>}
