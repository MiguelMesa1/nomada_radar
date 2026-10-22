import { z } from 'zod';
import { normalize, parseCOP } from './analytics';
import type { Sale } from './types';
export type CityAlias = { alias:string; ciudad_canonica:string; departamento:string };
export type ImportIssue = { row:number; sheet:string; type:string; message:string; pedido_id?:string };
const required = { pedido_id:['pedido_id','id pedido','id del pedido','id venta'],fecha:['fecha','fecha_venta','fecha venta'], total:['total del pedido','valor_total','total pedido','valor total'],post:['post id','post_id'],city:['ciudad'],department:['departamento'] };
const knownCities: Record<string,string> = {'bogota':'Bogotá','bogota d.c.':'Bogotá','bogota d.c':'Bogotá','medellin':'Medellín','cali':'Cali','barranquilla':'Barranquilla','bucaramanga':'Bucaramanga','ibague':'Ibagué','pereira':'Pereira','villavicencio':'Villavicencio','cucuta':'Cúcuta','tunja':'Tunja','pasto':'Pasto','neiva':'Neiva'};
export function parseSaleDate(value:unknown){
 const v=String(value??'').trim();
 const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
 let iso=v;
 if(match){const [,d,m,y]=match;iso=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
 const day=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);if(!day)return null;
 const [year,month,date]=day.slice(1).map(Number),check=new Date(Date.UTC(year,month-1,date));
 if(check.getUTCFullYear()!==year||check.getUTCMonth()+1!==month||check.getUTCDate()!==date)return null;
 if(/^\d{4}-\d{2}-\d{2}$/.test(iso))iso+='T12:00:00-05:00';
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(iso))return null;
 const result=z.string().datetime({offset:true}).safeParse(iso);return result.success?iso:null;
}
export function parseSheet(sheet:string,rows:unknown[][],aliases:CityAlias[]=[],validStates=['confirmado','pagado','entregado']){
 if(!rows.length)throw Error(`La pestaña ${sheet} está vacía. No se modifica la última carga.`);
 const headers=rows[0].map(normalize),idx=(names:string[])=>headers.findIndex(h=>names.includes(h));
 const c=Object.fromEntries(Object.entries(required).map(([k,n])=>[k,idx(n)])) as Record<keyof typeof required,number>;
 const missing=Object.entries(c).filter(([k,v])=>v<0&&k!=='pedido_id'&&k!=='total').map(([k])=>k);
 if(missing.length)throw Error(`Faltan columnas en ${sheet}: ${missing.join(', ')}. La carga anterior se conserva.`);
 const coordinateMode=c.pedido_id<0;
 const stateCol=idx(['estado','estado del pedido']),lineCol=idx(['linea','marca']),sales:Sale[]=[],issues:ImportIssue[]=[];let read=0;
 for(let i=1;i<rows.length;i++){
  const row=rows[i];if(!row.some(v=>String(v??'').trim()))continue;read++;
  const id=coordinateMode?`__fila__:${sheet}:${i+1}`:String(row[c.pedido_id]??'').trim(),date=parseSaleDate(row[c.fecha]),rawAmount=row[c.total],pendingAmount=rawAmount==null||String(rawAmount).trim()==='',amount=pendingAmount?null:parseCOP(rawAmount);
  if(!id||id.length>180||!date||(!pendingAmount&&amount===null)){issues.push({sheet,row:i+1,type:'invalid',message:!id?'Falta pedido_id':!date?'Fecha inválida':'Total del pedido inválido',pedido_id:id||undefined});continue;}
  const state=stateCol<0?'confirmado':normalize(row[stateCol]);
  if(stateCol>=0&&!state){issues.push({sheet,row:i+1,type:'invalid',message:'Falta estado',pedido_id:id});continue;}
  // Keep excluded orders in storage so a historical cancellation updates its original sale.
  const original=String(row[c.city]??'').trim(),dept=String(row[c.department]??'').trim(),alias=aliases.find(a=>normalize(a.alias)===normalize(original)&&normalize(a.departamento)===normalize(dept));
  const canonical=alias?.ciudad_canonica??knownCities[normalize(original)]??'';
  const post_id=String(row[c.post]??'').trim().toUpperCase();
  if(!canonical)issues.push({sheet,row:i+1,type:'city',message:'Ciudad pendiente de normalizar',pedido_id:id});
  if(pendingAmount)issues.push({sheet,row:i+1,type:'missing_total',message:'Total del pedido pendiente; la venta sí cuenta',pedido_id:id});
  sales.push({pedido_id:id,fecha_venta:date,post_id,ciudad_original:original,ciudad_normalizada:canonical,departamento:dept,importe_cop:amount,estado:state,linea:lineCol<0?'':String(row[lineCol]??'').trim()});
 }
 if(!read||!sales.length)throw Error(`No hay filas válidas en ${sheet}. Se conserva la carga anterior.`);
 if(coordinateMode&&issues.some(i=>i.type==='invalid'))throw Error(`Hay filas con fecha, estado o importe escrito inválido en ${sheet}. Los totales vacíos sí se admiten. Se conserva la carga anterior.`);
 if(issues.filter(i=>i.type==='invalid').length/read>0.05)throw Error(`Más del 5 % de las filas de ${sheet} son inválidas. Se bloquea la carga para revisar el origen.`);
 return {sales,issues,read,validStates};
}
export function consolidate(batches:ReturnType<typeof parseSheet>[]){
 const orders=new Map<string,Sale>(),issues=batches.flatMap(b=>b.issues);
 for(const batch of batches)for(const sale of batch.sales){const old=orders.get(sale.pedido_id);if(old){if(JSON.stringify(old)!==JSON.stringify(sale))throw Error(`El pedido ${sale.pedido_id} tiene datos distintos en dos filas. Corrige el duplicado antes de sincronizar.`);issues.push({sheet:'varias',row:0,type:'duplicate',message:'Pedido repetido; contado una sola vez',pedido_id:sale.pedido_id});}orders.set(sale.pedido_id,sale)}
 return {sales:[...orders.values()],issues,read:batches.reduce((a,b)=>a+b.read,0)};
}
