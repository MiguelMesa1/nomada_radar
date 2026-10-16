import { z } from 'zod';
import { parseSheet, consolidate, type CityAlias } from './ingestion';
import {canonicalLine} from './classification';
const monthlyInteractionSchema=z.object({mes:z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),rows:z.array(z.object({post_id:z.string().trim().min(1).max(100).transform(s=>s.toUpperCase()),interacciones:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict()).max(10000)}).strict();

// Only analytics fields are accepted. Client names, phone numbers and products
// never cross this interface, even when a spreadsheet has additional columns.
export const pushSchema=z.object({
 version:z.literal(1),
 sheets:z.array(z.object({
  spreadsheetId:z.string().regex(/^[\w-]{20,100}$/),
  sheetId:z.number().int().nonnegative(),
  name:z.string().min(1).max(100),
  rows:z.array(z.array(z.union([z.string().max(500),z.number().finite(),z.null()])).length(7)).min(1).max(50001)
 }).strict()).min(1).max(120),
 catalog:z.array(z.object({post_id:z.string().trim().min(1).max(100).transform(s=>s.toUpperCase()),producto:z.string().trim().min(1).max(120)}).strict()).max(10000).optional(),
 interactions:z.union([monthlyInteractionSchema,z.array(monthlyInteractionSchema).min(1).max(120)]).optional(),
 daily_interactions:z.array(z.object({mes:z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),sin_fecha:z.number().int().nonnegative(),rows:z.array(z.object({post_id:z.string().trim().min(1).max(100).transform(s=>s.toUpperCase()),fecha:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),interacciones:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).strict()).max(50000)}).strict()).min(1).max(120).optional()
}).strict();
export const pushHeaders=['Fecha','POST ID','Ciudad','Departamento','Total del pedido','Linea','Estado'];
export function parsePush(input:unknown,aliases:CityAlias[]=[]){
 const payload=pushSchema.parse(input),seen=new Set<string>();let count=0;
 const batches=payload.sheets.map(s=>{
  const identity=`${s.spreadsheetId}:${s.sheetId}`;
  if(seen.has(identity))throw Error('Pestaña repetida en la carga.');seen.add(identity);
  if(JSON.stringify(s.rows[0])!==JSON.stringify(pushHeaders))throw Error('Encabezados de integración inválidos.');
  count+=s.rows.length-1;if(count>50000)throw Error('La carga supera 50.000 filas; requiere dividir el histórico.');
  // Keep the original row offsets, including blank rows. Tab renames do not
  // change identity; separate yearly files cannot collide.
  if(!s.rows.slice(1).some(r=>r.some(v=>v!==null&&String(v).trim()!=='')))return null;
  const rows=s.rows.map((r,i)=>i===0||!r.some(v=>v!==null&&String(v).trim()!=='')?r:r.map((v,c)=>c===6&&(v===null||String(v).trim()==='')?'confirmado':v));
  const batch=parseSheet(identity,rows,aliases);
  batch.sales=batch.sales.map(s=>({...s,linea:canonicalLine(s.linea)}));
  batch.issues=batch.issues.map(i=>({...i,sheet:`${s.name} (${identity})`}));
  return batch;
 });
 const result=consolidate(batches.filter((b):b is NonNullable<typeof b>=>b!==null));
 if(!result.sales.length)throw Error('No hay ventas válidas para importar.');
 const catalog=payload.catalog===undefined?undefined:[...payload.catalog.reduce((all,item)=>{
  const old=all.get(item.post_id);
  if(old&&old.producto!==item.producto)throw Error(`El Post ID ${item.post_id} aparece en dos modelos distintos en IDS.`);
  all.set(item.post_id,item);return all;
 },new Map<string,{post_id:string;producto:string}>()).values()];
 const mappedCatalog=catalog?.map(p=>({...p,producto:canonicalLine(p.producto)}));
 const interactionGroups=payload.interactions?(Array.isArray(payload.interactions)?payload.interactions:[payload.interactions]):undefined;
 const months=new Set<string>();let interactionCount=0;
 const interactions=interactionGroups?.map(group=>{
  if(months.has(group.mes))throw Error('Hay dos bloques de interacciones para '+group.mes);months.add(group.mes);
  const counts=new Map<string,number>();
  for(const item of group.rows){if(counts.has(item.post_id)&&counts.get(item.post_id)!==item.interacciones)throw Error(`El Post ID ${item.post_id} tiene dos cantidades de interacciones distintas.`);counts.set(item.post_id,item.interacciones);}
  interactionCount+=counts.size;if(interactionCount>50000)throw Error('La carga supera 50.000 registros de interacciones.');
  return {mes:group.mes,rows:[...counts].map(([post_id,interacciones])=>({post_id,interacciones}))};
 });
 const datedMonths=new Set<string>();let datedCount=0;
 for(const group of payload.daily_interactions??[]){
  if(datedMonths.has(group.mes))throw Error('Hay dos bloques diarios para '+group.mes);datedMonths.add(group.mes);
  const keys=new Set<string>();for(const row of group.rows){if(!row.fecha.startsWith(group.mes+'-'))throw Error('Una interacción diaria está fuera de su mes.');const key=row.post_id+'|'+row.fecha;if(keys.has(key))throw Error('Hay dos conteos diarios para el mismo Post ID.');keys.add(key);}
  datedCount+=group.rows.length;if(datedCount>50000)throw Error('La carga supera 50.000 conteos diarios.');
 }
 return {...result,catalog:mappedCatalog,interactions,dailyInteractions:payload.daily_interactions};
}
