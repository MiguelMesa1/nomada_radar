// Entry point. Deploy the generated functions/sheets-push.bundle.mjs.
import { createAdminClient } from 'npm:@insforge/sdk@1.5.2';
import { z } from 'npm:zod@4.6.7';
const lineKey=(value        )=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const preparedLines=['XTZ 125','XTZ 150','Pulsar 180','Superlander','Boxer CT 100','NS 200','Cúpula','Accesorios'];
function canonicalLine(value        ){
 const text=String(value??'').trim(),key=lineKey(text);
 const aliases                      ={'pulsar':'Pulsar 180','pulsar 180':'Pulsar 180','pulsar180':'Pulsar 180','xtz125':'XTZ 125','xtz 125':'XTZ 125','xtz150':'XTZ 150','xtz 150':'XTZ 150','superlander':'Superlander','boxer':'Boxer CT 100','boxer ct 100':'Boxer CT 100','ns':'NS 200','ns200':'NS 200','ns 200':'NS 200','cupula':'Cúpula','accesorios':'Accesorios'};
 return aliases[key]??text;
}
function saleLine(sale     ,catalog              =[]){
 const line=canonicalLine(sale.linea),post=catalog.find(p=>p.post_id===sale.post_id);
 // Ventas!B716 explicitly names XTZ 125 (verified 2026-10-16). Guard
 // identity, date and missing Post ID so this is not a global XTZ alias.
 if(lineKey(line)==='xtz'){
  const model=post?canonicalLine(post.producto):'';
  if(['XTZ 125','XTZ 150'].includes(model))return model;
  if(!sale.post_id&&!!process.env.NEXT_PUBLIC_RADAR_XTZ_125_ROW&&sale.pedido_id===process.env.NEXT_PUBLIC_RADAR_XTZ_125_ROW&&Date.parse(sale.fecha_venta)===Date.parse('2026-10-01T21:56:35.000Z'))return 'XTZ 125';
 }
 return line||(post?postLine(post):'');
}
function postLine(post            ,sales       =[]){
 if(post.producto.trim())return canonicalLine(post.producto);
 const counts=new Map               ();for(const s of sales)if(s.post_id===post.post_id&&canonicalLine(s.linea)){const line=canonicalLine(s.linea);counts.set(line,(counts.get(line)??0)+1);}
 return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??'Sin línea';
}
function manufacturer(line       ){
 const key=lineKey(canonicalLine(line));
 if(/^xtz(?:\s|$)/.test(key))return 'Yamaha';
 if(/^(?:pulsar|ns\s?200|boxer)(?:\s|$)/.test(key))return 'Bajaj';
 if(key==='superlander')return 'Superlander';
 return 'Sin marca';
}
function postBrand(post            ,sales       =[]){return post.marca?.trim()||manufacturer(postLine(post,sales));}
function saleBrand(sale     ,catalog              ){const post=catalog.find(p=>p.post_id===sale.post_id);return post?.marca?.trim()||manufacturer(saleLine(sale,catalog));}

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });
const labelFormatter = new Intl.DateTimeFormat('es-CO', {day:'numeric',month:'short',timeZone:'America/Bogota'});
const money = (v               ) => v===null?'Pendiente':currencyFormatter.format(v);
const number = (v        ) => numberFormatter.format(v);
const compactMoney = (v        ) => Math.abs(v) >= 1e6 ? `$ ${number(v / 1e6)} M` : money(v);
const coveredMoney = (value       ,known       ,total       ) => !known&&total?'Pendiente':compactMoney(value)+(known<total?' (parcial)':'');
const percent = (v        ) => `${number(v)} %`;
const colombiaDay = (d      ) => dayFormatter.format(d);
const normalize = (v         ) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
function parseCOP(value         )                {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(value) ? value : null;
  const v = String(value ?? '').trim().replace(/COP|pesos?|\$|\s/gi, '');
  if (!v || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,0{1,2})?$/.test(v)) return null;
  const amount = Number(v.replace(/\./g, '').replace(/,0{1,2}$/, ''));
  return Number.isSafeInteger(amount) ? amount : null;
}
function dateRange(days        , end = colombiaDay(new Date())) {
  const start = new Date(`${end}T12:00:00-05:00`); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: colombiaDay(start), to: end };
}
function comparisonRange(from       ,to       ){
 if(from!==to&&from.endsWith('-01')&&from.slice(0,7)===to.slice(0,7)){
  const [year,month]=from.split('-').map(Number),last=new Date(Date.UTC(year,month,0,17)).getUTCDate();
  const previousStart=new Date(Date.UTC(year,month-2,1,17)).toISOString().slice(0,10),previousLast=new Date(Date.UTC(year,month-1,0,17)).getUTCDate();
  const endDay=Number(to.slice(-2))===last?previousLast:Math.min(Number(to.slice(-2)),previousLast);
  return {from:previousStart,to:previousStart.slice(0,8)+String(endDay).padStart(2,'0')};
 }
 const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1,previousTo=new Date(from+'T12:00:00-05:00');previousTo.setUTCDate(previousTo.getUTCDate()-1);return dateRange(days,colombiaDay(previousTo));
}
function inRange(sale      , from        , to        ) { const day = colombiaDay(new Date(sale.fecha_venta)); return day >= from && day <= to; }
function validSales(sales        , from        , to        ) { return sales.filter(s => inRange(s, from, to)); }
function metrics(sales        , catalog               , from        , to        ) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const prev = comparisonRange(from,to);
  // Convert each timestamp once, including at Colombia's midnight boundary.
  const current         = [], previous         = [], saleDays = new Map              ();
  for (const sale of sales) {
    const day = colombiaDay(new Date(sale.fecha_venta));
    if (day >= from && day <= to) { current.push(sale); saleDays.set(sale, day); }
    else if (day >= prev.from && day <= prev.to) previous.push(sale);
  }
  const total = current.length, pricedOrders=current.filter(s=>s.importe_cop!==null).length, pendingTotals=total-pricedOrders, value = current.reduce((a, s) => a + (s.importe_cop??0), 0);
  const groups = new Map                (), dayGroups = new Map                                                          (), postDays = new Map                           (), previousPosts=new Map               ();
  for(const s of previous)previousPosts.set(s.post_id,(previousPosts.get(s.post_id)??0)+1);
  for (const s of current) { const group=groups.get(s.post_id);if(group)group.push(s);else groups.set(s.post_id,[s]);const day=saleDays.get(s) ,bucket=dayGroups.get(day)??{pedidos:0,valor:0,pricedOrders:0};bucket.pedidos++;bucket.valor+=s.importe_cop??0;if(s.importe_cop!==null)bucket.pricedOrders++;dayGroups.set(day,bucket);const pd=postDays.get(s.post_id)??new Map               ();pd.set(day,(pd.get(day)??0)+1);postDays.set(s.post_id,pd); }
  const trendDays = Array.from({length: 14}, (_, i) => dateRange(14-i,to).from);
  const posts               = catalog.map(p => {
    const rows = groups.get(p.post_id) ?? [], amount = rows.reduce((a, s) => a + (s.importe_cop??0), 0),priced=rows.filter(s=>s.importe_cop!==null).length;
    return { ...p, orders: rows.length, value: amount, ticket: priced ? amount / priced : null, pricedOrders:priced,pendingTotals:rows.length-priced,share: total ? rows.length / total * 100 : 0, previous: previousPosts.get(p.post_id)??0, trend: trendDays.map(day => postDays.get(p.post_id)?.get(day)??0) };
  }).sort((a, b) => b.orders - a.orders);
  const daily = Array.from({ length: days }, (_, i) => {
    const day = dateRange(days - i, to).from, bucket=dayGroups.get(day);
    return { day, label: labelFormatter.format(new Date(day+'T12:00:00-05:00')), pedidos: bucket?.pedidos??0, valor: bucket&&bucket.pedidos&&!bucket.pricedOrders?null:bucket?.valor??0 };
  });
  return { current, previous, total, value, pricedOrders,pendingTotals,ticket: pricedOrders ? value / pricedOrders : null, posts, daily, missing: current.filter(s=>!s.post_id).length };
}
function aggregate(sales        , field                                                 ) {
  const map = new Map                                                                                                                                 ();
  for (const s of sales) { const name = s[field] || (field==='ciudad_normalizada'?s.ciudad_original:'') || 'Por normalizar';const id=field==='ciudad_normalizada'?`${name}|${normalize(s.departamento)}`:name; const entry = map.get(id) ?? { id,name, orders: 0, value: 0, pricedOrders:0,pendingTotals:0, department: s.departamento }; entry.orders++; entry.value += s.importe_cop??0;if(s.importe_cop===null)entry.pendingTotals++;else entry.pricedOrders++; map.set(id, entry); }
  return [...map.values()].sort((a,b)=>b.orders-a.orders);
}
function csvCell(value         ) { const s = String(value ?? ''); return '"' + (/^(?:[\s\u0000-\u001f]*[=+@\-]|[\t\r\n])/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'; }
function toCSV(headers          , rows             ) { return '\uFEFF' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n'); }



const required = { pedido_id:['pedido_id','id pedido','id del pedido','id venta'],fecha:['fecha','fecha_venta','fecha venta'], total:['total del pedido','valor_total','total pedido','valor total'],post:['post id','post_id'],city:['ciudad'],department:['departamento'] };
const knownCities                        = {'bogota':'Bogotá','bogota d.c.':'Bogotá','bogota d.c':'Bogotá','medellin':'Medellín','cali':'Cali','barranquilla':'Barranquilla','bucaramanga':'Bucaramanga','ibague':'Ibagué','pereira':'Pereira','villavicencio':'Villavicencio','cucuta':'Cúcuta','tunja':'Tunja','pasto':'Pasto','neiva':'Neiva'};
function parseSaleDate(value        ){
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
function parseSheet(sheet       ,rows            ,aliases            =[],validStates=['confirmado','pagado','entregado']){
 if(!rows.length)throw Error(`La pestaña ${sheet} está vacía. No se modifica la última carga.`);
 const headers=rows[0].map(normalize),idx=(names         )=>headers.findIndex(h=>names.includes(h));
 const c=Object.fromEntries(Object.entries(required).map(([k,n])=>[k,idx(n)]))                                        ;
 const missing=Object.entries(c).filter(([k,v])=>v<0&&k!=='pedido_id'&&k!=='total').map(([k])=>k);
 if(missing.length)throw Error(`Faltan columnas en ${sheet}: ${missing.join(', ')}. La carga anterior se conserva.`);
 const coordinateMode=c.pedido_id<0;
 const stateCol=idx(['estado','estado del pedido']),lineCol=idx(['linea','marca']),sales       =[],issues              =[];let read=0;
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
  if(!post_id)issues.push({sheet,row:i+1,type:'missing_post',message:'Pedido sin Post ID',pedido_id:id});
  if(!canonical)issues.push({sheet,row:i+1,type:'city',message:'Ciudad pendiente de normalizar',pedido_id:id});
  if(pendingAmount)issues.push({sheet,row:i+1,type:'missing_total',message:'Total del pedido pendiente; la venta sí cuenta',pedido_id:id});
  sales.push({pedido_id:id,fecha_venta:date,post_id,ciudad_original:original,ciudad_normalizada:canonical,departamento:dept,importe_cop:amount,estado:state,linea:lineCol<0?'':String(row[lineCol]??'').trim()});
 }
 if(!read||!sales.length)throw Error(`No hay filas válidas en ${sheet}. Se conserva la carga anterior.`);
 if(coordinateMode&&issues.some(i=>i.type==='invalid'))throw Error(`Hay filas con fecha, estado o importe escrito inválido en ${sheet}. Los totales vacíos sí se admiten. Se conserva la carga anterior.`);
 if(issues.filter(i=>i.type==='invalid').length/read>0.05)throw Error(`Más del 5 % de las filas de ${sheet} son inválidas. Se bloquea la carga para revisar el origen.`);
 return {sales,issues,read,validStates};
}
function consolidate(batches                                ){
 const orders=new Map             (),issues=batches.flatMap(b=>b.issues);
 for(const batch of batches)for(const sale of batch.sales){const old=orders.get(sale.pedido_id);if(old){if(JSON.stringify(old)!==JSON.stringify(sale))throw Error(`El pedido ${sale.pedido_id} tiene datos distintos en dos filas. Corrige el duplicado antes de sincronizar.`);issues.push({sheet:'varias',row:0,type:'duplicate',message:'Pedido repetido; contado una sola vez',pedido_id:sale.pedido_id});}orders.set(sale.pedido_id,sale)}
 return {sales:[...orders.values()],issues,read:batches.reduce((a,b)=>a+b.read,0)};
}

const monthlyInteractionSchema=z.object({mes:z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),rows:z.array(z.object({post_id:z.string().trim().min(1).max(100).transform(s=>s.toUpperCase()),interacciones:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict()).max(10000)}).strict();

// Only analytics fields are accepted. Client names, phone numbers and products
// never cross this interface, even when a spreadsheet has additional columns.
const pushSchema=z.object({
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
const pushHeaders=['Fecha','POST ID','Ciudad','Departamento','Total del pedido','Linea','Estado'];
function parsePush(input        ,aliases            =[]){
 const payload=pushSchema.parse(input),seen=new Set        ();let count=0;
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
 const result=consolidate(batches.filter((b)                           =>b!==null));
 if(!result.sales.length)throw Error('No hay ventas válidas para importar.');
 const catalog=payload.catalog===undefined?undefined:[...payload.catalog.reduce((all,item)=>{
  const old=all.get(item.post_id);
  if(old&&old.producto!==item.producto)throw Error(`El Post ID ${item.post_id} aparece en dos modelos distintos en IDS.`);
  all.set(item.post_id,item);return all;
 },new Map                                         ()).values()];
 const mappedCatalog=catalog?.map(p=>({...p,producto:canonicalLine(p.producto)}));
 const interactionGroups=payload.interactions?(Array.isArray(payload.interactions)?payload.interactions:[payload.interactions]):undefined;
 const months=new Set        ();let interactionCount=0;
 const interactions=interactionGroups?.map(group=>{
  if(months.has(group.mes))throw Error('Hay dos bloques de interacciones para '+group.mes);months.add(group.mes);
  const counts=new Map               ();
  for(const item of group.rows){if(counts.has(item.post_id)&&counts.get(item.post_id)!==item.interacciones)throw Error(`El Post ID ${item.post_id} tiene dos cantidades de interacciones distintas.`);counts.set(item.post_id,item.interacciones);}
  interactionCount+=counts.size;if(interactionCount>50000)throw Error('La carga supera 50.000 registros de interacciones.');
  return {mes:group.mes,rows:[...counts].map(([post_id,interacciones])=>({post_id,interacciones}))};
 });
 const datedMonths=new Set        ();let datedCount=0;
 for(const group of payload.daily_interactions??[]){
  if(datedMonths.has(group.mes))throw Error('Hay dos bloques diarios para '+group.mes);datedMonths.add(group.mes);
  const keys=new Set        ();for(const row of group.rows){if(!row.fecha.startsWith(group.mes+'-'))throw Error('Una interacción diaria está fuera de su mes.');const key=row.post_id+'|'+row.fecha;if(keys.has(key))throw Error('Hay dos conteos diarios para el mismo Post ID.');keys.add(key);}
  datedCount+=group.rows.length;if(datedCount>50000)throw Error('La carga supera 50.000 conteos diarios.');
 }
 return {...result,catalog:mappedCatalog,interactions,dailyInteractions:payload.daily_interactions};
}


const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
async function boundedBody(req){
 const length=req.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>8000000))throw Object.assign(Error('Carga mayor de 8 MB.'),{status:413});
 const reader=req.body?.getReader();if(!reader)throw Error('Carga vacía.');let size=0;const chunks=[];let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Object.assign(Error('La carga tardó demasiado.'),{status:408}));void reader.cancel().catch(()=>{})},30000)});
 try{while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>8000000){void reader.cancel().catch(()=>{});throw Object.assign(Error('Carga mayor de 8 MB.'),{status:413})}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length}return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}finally{clearTimeout(timer);reader.releaseLock()}
}
async function equalSecret(a,b){
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let different=0;
 for(let i=0;i<x.length;i++)different|=x[i]^y[i];return different===0;
}
export default async function handler(req){
 if(req.method!=='POST')return json({error:'Usa POST.'},405);
 const secret=Deno.env.get('RADAR_SHEETS_TOKEN');
 if(!secret)return json({error:'Integración sin configurar.'},503);
 if(!await equalSecret(req.headers.get('x-radar-token')||'',secret))return json({error:'No autorizado.'},401);
 const admin=createAdminClient({baseUrl:Deno.env.get('INSFORGE_BASE_URL'),apiKey:Deno.env.get('API_KEY')});
 let run=null;
 try{
  const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('radar:receiver:all')))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const budget=await admin.database.rpc('radar_consume_limits',{p_limits:[{key,limit:8,seconds:300}]});
  if(budget.error||typeof budget.data?.allowed!=='boolean')return json({error:'Protección temporalmente no disponible.'},503);
  if(!budget.data.allowed)return json({error:'Demasiadas cargas. Espera antes de actualizar.'},429,{'Retry-After':String(budget.data.retry_after||60)});
  const text=await boundedBody(req);
  const input=JSON.parse(text);
  // Readiness probe never creates sync runs or business data.
  if(input.probe===true){
   // Exercise the real deployed parser, not only connectivity or schema rejection.
   const sample=parsePush({version:1,sheets:[{spreadsheetId:'radar_readiness_check_only',sheetId:0,name:'Ventas',rows:[pushHeaders,['15/10/2026','TEST','Bogotá','Cundinamarca',null,'',null]]}]});
   if(sample.sales.length!==1||sample.sales[0].importe_cop!==null||!sample.sales[0].fecha_venta.startsWith('2026-10-15'))throw Error('El validador de fechas no está disponible.');
   const check=await admin.database.from('sync_runs').select('id').limit(1);if(check.error)throw Error('No se pudo consultar el backend.');return json({ok:true,ready:true,parser:true});
  }
  const aliases=await admin.database.from('city_aliases').select('alias,ciudad_canonica,departamento').limit(10000);
  if(aliases.error)throw Error('No se pudieron leer los alias.');
  const batch=parsePush(input,aliases.data||[]);
  const start=await admin.database.rpc('radar_begin_sync',{});
  if(start.error)return json({error:'Otra sincronización está en curso; intenta más tarde.'},409);
  run=start.data;
  const commit=await admin.database.rpc(batch.dailyInteractions?'radar_commit_dated_sync':'radar_commit_report_sync',{p_run:run,p_sales:batch.sales,p_issues:batch.issues,p_rows:batch.read,p_catalog:batch.catalog??null,p_interactions:batch.interactions??null,...(batch.dailyInteractions?{p_daily_interactions:batch.dailyInteractions}:{})});
  if(commit.error)throw Error(commit.error.message.includes('SOURCE_ROWS_MISSING')?'Faltan filas o archivos ya importados. Conserva todos los archivos registrados y revisa filas borradas.':'No se pudo guardar la carga.');
  return json({ok:true,orders:batch.sales.length,issues:batch.issues.length,...(batch.catalog===undefined?{}:{catalog:batch.catalog.length}),...(batch.interactions?{interactions:batch.interactions.reduce((sum,m)=>sum+m.rows.length,0),interactionMonths:batch.interactions.map(m=>m.mes)}:{})});
 }catch(e){
  const safe=e?.name==='ZodError'?'Formato de carga inválido.':e instanceof SyntaxError?'JSON inválido.':e.message||'La carga falló.';
  if(run)await admin.database.rpc('radar_fail_sync',{p_run:run,p_error:safe});
  return json({error:safe},e.status||422);
 }
}
