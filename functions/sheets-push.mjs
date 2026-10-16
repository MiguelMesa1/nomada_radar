// Entry point. Deploy the generated functions/sheets-push.bundle.mjs.
import { createAdminClient } from 'npm:@insforge/sdk@1.5.2';
/* SHARED_PARSER */
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
