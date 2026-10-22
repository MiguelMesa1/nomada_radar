'use client';
import {useState,type FormEvent} from 'react';
import {Pencil} from 'lucide-react';
import {Modal} from './ui/dialog';
import {preparedLines} from '@/lib/classification';
import {colombiaDay,money,number} from '@/lib/analytics';
import {saleSource} from '@/lib/sale-source';
import type {Sale} from '@/lib/types';

export function SalesDetail({sales,line,lines=[],onAssignSale}:{sales:Sale[];line:string;lines?:string[];onAssignSale?:(sale:Sale,line:string)=>Promise<void>}){
 const [target,setTarget]=useState<Sale|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!target||!onAssignSale||saving)return;
  const value=String(new FormData(event.currentTarget).get('linea')??'');setSaving(true);setError('');
  try{await onAssignSale(target,value);setTarget(null)}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar la línea.')}finally{setSaving(false)}
 }
 const [requestedPage,setPage]=useState(0),pages=Math.max(1,Math.ceil(sales.length/50)),page=Math.min(requestedPage,pages-1);
 const start=page*50,end=Math.min(start+50,sales.length);
 return <section className="conversion-sales sales-detail" aria-label={`Ventas individuales de ${line}`}>
  <h3>{number(sales.length)} {sales.length===1?'venta':'ventas'} · {line}</h3>
  <p className="muted small">Cada fila es una venta. Incluye las ventas Sin ID y las que comparten Post ID. La referencia indica la hoja y fila de origen.{onAssignSale&&' Las ventas Sin ID permiten asignar su línea aquí; se conserva la línea importada.'}</p>
  <p className="table-summary" role="status">Mostrando {sales.length?start+1:0}–{end} de {number(sales.length)} ventas</p>
  <div className="table-wrap"><table aria-label={`Detalle de ventas de ${line}`}><thead><tr>{['Post ID','Fecha','Línea','Importe','Referencia de origen',...(onAssignSale?['Clasificación']:[])].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{sales.slice(start,end).map(sale=>{
   const source=saleSource(sale.pedido_id);
   return <tr key={sale.pedido_id}><td>{sale.post_id||'Sin ID'}</td><td>{colombiaDay(new Date(sale.fecha_venta))}</td><td>{sale.linea||'Sin línea'}{sale.linea_importada!==undefined&&<small>Importada: {sale.linea_importada||'Sin línea'}</small>}</td><td>{money(sale.importe_cop)}</td><td>{source?<span>{source.label}</span>:<span className="muted">Posición no disponible</span>}</td>{onAssignSale&&<td>{!sale.post_id&&<button type="button" className="button small" aria-label={'Asignar línea a venta '+sale.pedido_id} onClick={()=>{setError('');setTarget(sale)}}><Pencil size={13} aria-hidden="true"/>{sale.linea_importada!==undefined?'Cambiar línea':'Asignar línea'}</button>}</td>}</tr>;
  })}</tbody></table>{!sales.length&&<p className="empty">Sin ventas en este periodo.</p>}</div>
  {pages>1&&<div className="geo-pagination"><span>Página {page+1} de {pages}</span><div><button type="button" className="button small" disabled={!page} onClick={()=>setPage(page-1)}>Anterior</button><button type="button" className="button small" disabled={page+1===pages} onClick={()=>setPage(page+1)}>Siguiente</button></div></div>}
  <Modal open={!!target} onClose={()=>{if(!saving)setTarget(null)}} title="Asignar línea a venta" description={target?`Sin ID · ${colombiaDay(new Date(target.fecha_venta))} · ${saleSource(target.pedido_id)?.label??target.pedido_id}`:undefined}><form className="form" onSubmit={save}><label>Línea<input name="linea" aria-label="Línea de la venta" required maxLength={120} list="sale-line-options" defaultValue={target?.linea==='Sin línea'?'':target?.linea} placeholder="Selecciona o escribe una línea" autoFocus/><datalist id="sale-line-options">{[...new Set([...preparedLines,'Otra marca',...lines])].filter(name=>name!=='Sin línea').map(name=><option key={name} value={name}/>)}</datalist></label><p className="muted small">Se aplica solo a esta venta. Puedes asignar una línea o dejarla como «Otra marca». La fila de Excel y el estado Sin ID se conservan.</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button" disabled={saving} onClick={()=>setTarget(null)}>Cancelar</button><button className="button black" disabled={saving}>{saving?'Guardando…':'Guardar línea'}</button></div></form></Modal>
 </section>;
}
