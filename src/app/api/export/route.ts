import {lineConversion,filterLineConversion,lineConversionCSV} from '@/lib/line-conversion';
import {sortPostMetrics} from '@/lib/post-table';
import {protectRequest,protectUser} from '@/lib/security';
import {locationSales} from '@/lib/locations';
import { linesCSV } from '@/lib/lines';
import { aggregate, metrics, normalize, toCSV } from '@/lib/analytics';
import {saleLine,postLine} from '@/lib/classification';
import {interactionRanking} from '@/lib/interaction-ranking';
import {filterInteractions,interactionsCSV} from '@/lib/interactions-report';
import {conversionForPost} from '@/lib/conversion';
import { loadSnapshot } from '@/lib/data';
import { failure,parseRange,requireProfile } from '@/lib/server';
export async function GET(r:Request){try{
 await protectRequest(r,'export');const auth=await requireProfile(['principal','analista']);await protectUser(auth.profile.user_id,'export');
 const u=new URL(r.url),{from,to}=parseRange(u),data=await loadSnapshot(from,to,auth);
 const sales=data.sales.map(s=>({...s,linea:saleLine(s,data.catalog)}));
 const catalog=data.catalog,m=metrics(sales,catalog,from,to);let csv:string;
 if(u.searchParams.get('view')==='interacciones')csv=interactionsCSV(filterInteractions(interactionRanking(data,{from,to}),sales,u.searchParams.get('q')??'',u.searchParams.get('line')??'',u.searchParams.get('sort')??'interactions'),sales);
 else if(u.searchParams.get('view')==='conversion')csv=lineConversionCSV(filterLineConversion(lineConversion({...data,sales,catalog},{from,to}),u.searchParams.get('q')??'',u.searchParams.get('line')??'',u.searchParams.get('sort')??'conversion'));
 else if(u.searchParams.get('view')==='lineas')csv=linesCSV(m.current,m.previous,u.searchParams.get('lineGroup')??'');
 else if(u.searchParams.get('view')==='ubicaciones'){
  const cities=aggregate(locationSales(m.current,data.catalog,u.searchParams.get('line')??'',u.searchParams.get('post')??''),u.searchParams.get('level')==='Departamentos'?'departamento':'ciudad_normalizada').filter(c=>!u.searchParams.get('city')||c.name===u.searchParams.get('city')).sort((a,b)=>u.searchParams.get('metric')==='Valor'?b.value-a.value:b.orders-a.orders);
  csv=toCSV(['Destino','Pedidos','Valor conocido COP','Ventas con total','Totales pendientes'],cities.map(c=>[c.name,c.orders,c.pricedOrders?c.value:null,c.pricedOrders,c.pendingTotals]));
 }else{
  const q=normalize(u.searchParams.get('q')),f=u.searchParams.get('filter')??'Todos',line=u.searchParams.get('line')??'';
  const posts=sortPostMetrics(m.posts.filter(p=>(!q||normalize(p.post_id+' '+p.nombre_creativo+' '+postLine(p,sales)).includes(q))&&(!line||postLine(p,sales)===line)&&(f==='Todos'||f==='Con ventas'&&p.orders>0||f==='Sin ventas'&&!p.orders||f==='Inactivos'&&!p.activo||f==='Activos'&&p.activo)),{sales,interactions:data.interactions,dailyInteractions:data.dailyInteractions,range:{from,to}},u.searchParams.get('sort')??'orders',u.searchParams.get('dir')==='asc'?'asc':'desc');
  csv=toCSV(['Post ID','Creativo','Línea','Pedidos','Interacciones del periodo','Conversión ventas/interacciones %','Valor conocido COP','Ticket COP (solo totales conocidos)','Participación %','Ventas con total','Totales pendientes'],posts.map(p=>{const conversion=conversionForPost(p.post_id,p.orders,data.interactions??[],{from,to},data.dailyInteractions??[]);return[p.post_id,p.nombre_creativo,postLine(p,sales),p.orders,conversion.interactions,conversion.rate,p.pricedOrders||!p.orders?p.value:null,p.ticket,p.share,p.pricedOrders,p.pendingTotals];}));
 }
 return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="nomada-${from}-${to}.csv"`}});
}catch(e){return failure(e)}}
