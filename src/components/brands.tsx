'use client';
import { useMemo, useState } from 'react';
import { brandId, brandMetrics } from '@/lib/brands';
import { aggregate, coveredMoney, metrics, money, number, percent,normalize } from '@/lib/analytics';
import {canonicalLine,postLine,preparedLines} from '@/lib/classification';
import type { Sale,CatalogPost,PostMetric } from '@/lib/types';
import { SalesChart } from './charts';

export function Brands({current, previous,catalog, from, to, selected, onSelect,onPostSelect}: {
  current: Sale[]; previous: Sale[]; catalog:CatalogPost[]; from: string; to: string;
  selected: string; onSelect: (id: string) => void;onPostSelect:(post:PostMetric)=>void;
}) {
  const [sort, setSort] = useState('orders');
  const [chartValue, setChartValue] = useState(false);
  const brands = useMemo(() => brandMetrics(current, previous), [current, previous]);
  const rows = useMemo(() => current.filter(s => !selected || brandId(s) === selected), [current, selected]);
  const prior = useMemo(() => previous.filter(s => !selected || brandId(s) === selected), [previous, selected]);
  const summary = useMemo(() => metrics(rows, catalog, from, to), [rows,catalog, from, to]);
  const lineOptions=useMemo(()=>[...new Set([...preparedLines,...catalog.map(p=>postLine(p,current)),...current.map(s=>canonicalLine(s.linea)),...previous.map(s=>canonicalLine(s.linea)),...(current.some(s=>!s.linea.trim())?['Sin línea']:[])])].filter(Boolean).sort().map(name=>({name,id:name==='Sin línea'?'missing':`brand:${normalize(name)}`})),[catalog,current,previous]);
  const cities = useMemo(() => aggregate(rows, 'ciudad_normalizada'), [rows]);
  const ordered = [...brands].sort((a, b) => sort === 'value' ? b.value - a.value : b.orders - a.orders);
  const active = brands.find(b => b.id === selected)??lineOptions.find(b=>b.id===selected);
  const change = prior.length ? (rows.length - prior.length) / prior.length * 100 : null;
  const stats = [
    ['Cantidad de ventas', number(rows.length), change === null ? 'Sin ventas en el periodo anterior' : `${change >= 0 ? '+' : ''}${percent(change)} vs. periodo anterior`],
    ['Valor vendido', coveredMoney(summary.value, summary.pricedOrders, summary.total), `${number(summary.pricedOrders)} de ${number(rows.length)} ventas con total`],
    ['Ticket promedio', rows.length ? money(summary.ticket) : '—', 'Solo ventas con total conocido'],
    ['Participación', percent(current.length ? rows.length / current.length * 100 : 0), 'De las ventas del periodo'],
  ];
  return <>
    <div className="line-buttons" aria-label="Seleccionar línea"><button className={`line-button ${!selected?'active':''}`} aria-pressed={!selected} onClick={()=>onSelect('')}>Todas las líneas <span>{number(current.length)}</span></button>{lineOptions.map(line=><button className={`line-button ${selected===line.id?'active':''}`} key={line.id} aria-pressed={selected===line.id} onClick={()=>onSelect(selected===line.id?'':line.id)}>{line.name}<span>{number(brands.find(b=>b.id===line.id)?.orders??0)}</span></button>)}</div>
    <div className="toolbar">
      <label className="brand-filter">Línea
        <select aria-label="Filtrar por línea" value={selected} onChange={e => onSelect(e.target.value)}>
          <option value="">Todas las líneas</option>
          {lineOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          {selected && !active && <option value={selected}>Sin ventas en este periodo</option>}
        </select>
      </label>
      <p className="muted small">Una venta por fila de la hoja · destinos reportados en el pedido.</p>
    </div>
    <div className="kpis">{stats.map(([label, value, note]) => <div className="card kpi" key={label}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></div>)}</div>
    <section className="table-wrap brand-comparison">
      <div className="panel-heading panel"><h2>Comparativo de líneas</h2><select aria-label="Ordenar líneas" value={sort} onChange={e => setSort(e.target.value)}><option value="orders">Más ventas</option><option value="value">Mayor valor conocido</option></select></div>
      <table><thead><tr>{['Línea', 'Ventas', 'Participación', 'Valor conocido', 'Ticket promedio', 'Vs. periodo anterior', 'Ciudades', 'Ciudad líder'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{ordered.map(b => <tr key={b.id} className={selected === b.id ? 'brand-selected' : ''}>
          <td><button className="text-link" aria-pressed={selected === b.id} onClick={() => onSelect(selected === b.id ? '' : b.id)}>{b.name}</button></td>
          <td><b>{number(b.orders)}</b></td><td>{percent(b.share)}</td><td>{coveredMoney(b.value, b.pricedOrders, b.orders)}</td><td>{money(b.ticket)}</td>
          <td>{b.change === null ? 'Sin base anterior' : `${b.change >= 0 ? '+' : ''}${percent(b.change)}`}<small>{number(b.previousOrders)} ventas antes</small></td>
          <td>{number(b.cityCount)}</td><td>{b.topCity ? <>{b.topCity.name}<small>{b.topCity.department} · {number(b.topCity.orders)} ventas</small></> : 'Sin ciudad registrada'}</td>
        </tr>)}</tbody></table>
      {!brands.length && <div className="empty"><h3>Sin ventas en este periodo</h3><p>Selecciona otro rango de fechas.</p></div>}
    </section>
    <div className="dashboard-bottom">
      <section className="card panel"><div className="panel-heading"><h2>Evolución · {active?.name ?? (selected ? 'Línea seleccionada' : 'Todas las líneas')}</h2><button className="button small" onClick={() => setChartValue(!chartValue)}>{chartValue ? 'Ver cantidad' : 'Ver valor'}</button></div><SalesChart data={summary.daily} value={chartValue}/>{summary.pendingTotals > 0 && <p className="muted small">El valor es parcial: {number(summary.pendingTotals)} ventas tienen total pendiente.</p>}</section>
      <section className="card panel"><h2>Concentración de destinos</h2><div className="brand-insights"><div><span>Ciudad líder</span><strong>{cities.find(c => c.name !== 'Por normalizar')?.name ?? 'Sin ciudad registrada'}</strong></div><div><span>Ventas en las 3 ciudades principales</span><strong>{percent(cities.filter(c => c.name !== 'Por normalizar').slice(0, 3).reduce((sum, c) => sum + c.orders, 0) / (rows.length || 1) * 100)}</strong></div><div><span>Ventas sin línea</span><strong>{number(current.filter(s => brandId(s) === 'missing').length)}</strong></div></div><p className="muted small">Selecciona una línea en el comparativo para explorar sus destinos y evolución. La participación del comparativo siempre usa el total del periodo.</p></section>
    </div>
    <section className="card panel line-top-posts"><h2>Post ID más vendedores · {active?.name??'Todas las líneas'}</h2>{summary.posts.filter(p=>p.orders>0).slice(0,5).map((p,i)=><button className="line-post-row" key={p.post_id} onClick={()=>onPostSelect(p)}><span className="rank-index">{i+1}</span><span><b>{p.post_id}</b><small>{p.nombre_creativo}</small></span><span><b>{number(p.orders)} ventas</b><small>{coveredMoney(p.value,p.pricedOrders,p.orders)}</small></span></button>)}{!summary.posts.some(p=>p.orders>0)&&<p className="muted">No hay Post ID con ventas registradas para esta selección.</p>}</section>
    <section className="table-wrap brand-destinations"><div className="panel"><h2>Ciudades donde más vendes · {active?.name ?? (selected ? 'Línea seleccionada' : 'Todas las líneas')}</h2><p className="muted small">Ordenadas por cantidad de ventas. Los porcentajes corresponden a la selección actual.</p></div>
      <table><thead><tr>{['Ciudad', 'Departamento', 'Ventas', '% de ventas', 'Valor conocido', 'Ticket promedio', 'Totales pendientes'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{cities.map(c => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.department || 'Sin departamento'}</td><td>{number(c.orders)}</td><td>{percent(c.orders / (rows.length || 1) * 100)}</td><td>{coveredMoney(c.value, c.pricedOrders, c.orders)}</td><td>{money(c.pricedOrders ? c.value / c.pricedOrders : null)}</td><td>{number(c.pendingTotals)}</td></tr>)}</tbody></table>
      {!cities.length && <div className="empty"><h3>Sin destinos para esta selección</h3><p>Cambia la línea o el periodo.</p></div>}
    </section>
  </>;
}
