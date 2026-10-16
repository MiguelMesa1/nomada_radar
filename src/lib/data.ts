import 'server-only';
import { comparisonRange } from './analytics';
import { AppError, requireProfile } from './server';
import type { Sale, Snapshot } from './types';
import type {DatedInteractionMonth} from './dated-interactions';
export async function loadSnapshot(from:string,to:string,auth?:Awaited<ReturnType<typeof requireProfile>>):Promise<Snapshot>{
 const {client,profile}=auth??await requireProfile();const since=comparisonRange(from,to).from;
 const [catalog,runs,sales,interactions,coverage,days]=await Promise.all([client.database.from('post_catalog').select('post_id,nombre_creativo,campana,producto,marca,plataforma,activo,fecha_inicio').order('fecha_inicio',{ascending:false}).limit(10000),client.database.from('sync_runs').select('id,started_at,completed_at,status,filas_leidas,filas_validas,error').order('started_at',{ascending:false}).limit(20),loadSales(),client.database.from('post_interactions').select('post_id,mes,interacciones,updated_at').gte('mes',from.slice(0,7)).lte('mes',to.slice(0,7)).limit(10001),client.database.from('post_interaction_coverage').select('mes,sin_fecha,updated_at').gte('mes',from.slice(0,7)).lte('mes',to.slice(0,7)).limit(120),loadDays()]);
 if(catalog.error||runs.error||interactions.error||coverage.error)throw new AppError('No pudimos cargar el catálogo, las interacciones o el historial de sincronización.',503);
 if((interactions.data?.length??0)>10000)throw new AppError('El periodo supera 10.000 registros de interacciones. Reduce el rango.',422);
 async function loadSales():Promise<Sale[]>{
 const sales:Sale[]=[];for(let page=0;page<100;page++){
  const {data,error}=await client.database.from('sales_orders').select('pedido_id,fecha_venta,post_id,ciudad_original,ciudad_normalizada,departamento,importe_cop,estado,linea').gte('fecha_venta',since+'T00:00:00-05:00').lte('fecha_venta',to+'T23:59:59.999-05:00').in('estado',(process.env.VALID_SALE_STATES??'confirmado,pagado,entregado').split(',').map(s=>s.trim())).order('pedido_id').range(page*1000,page*1000+999);
  if(error)throw new AppError('No pudimos leer las ventas. Intenta de nuevo.',503);sales.push(...(data as Sale[]??[]));if((data?.length??0)<1000)break;if(page===99)throw new AppError('Este periodo supera 100.000 pedidos. Reduce el rango para consultar cifras completas.',422);
 }
 return sales;
 }
 async function loadDays(){const result:DatedInteractionMonth['rows']=[];for(let page=0;page<50;page++){
  const response=await client.database.from('post_interaction_days').select('post_id,fecha,interacciones').gte('fecha',from).lte('fecha',to).order('post_id').order('fecha').range(page*1000,page*1000+999);
  if(response.error)throw new AppError('No pudimos cargar las interacciones por fecha.',503);
  result.push(...response.data??[]);if((response.data?.length??0)<1000)return result;
 }throw new AppError('El periodo supera 50.000 conteos diarios de interacciones. Reduce el rango.',422);}
 const dailyInteractions:DatedInteractionMonth[]=(coverage.data??[]).map(c=>({...c,rows:days.filter(d=>d.fecha.startsWith(c.mes+'-'))}));
 return {mode:'live',profile,catalog:catalog.data??[],sales,runs:runs.data??[],interactions:interactions.data??[],dailyInteractions};
}
