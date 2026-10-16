import type { CatalogPost, Sale, PostMetric } from './types';
const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });
const labelFormatter = new Intl.DateTimeFormat('es-CO', {day:'numeric',month:'short',timeZone:'America/Bogota'});
export const money = (v: number | null) => v===null?'Pendiente':currencyFormatter.format(v);
export const number = (v: number) => numberFormatter.format(v);
export const compactMoney = (v: number) => Math.abs(v) >= 1e6 ? `$ ${number(v / 1e6)} M` : money(v);
export const coveredMoney = (value:number,known:number,total:number) => !known&&total?'Pendiente':compactMoney(value)+(known<total?' (parcial)':'');
export const percent = (v: number) => `${number(v)} %`;
export const colombiaDay = (d: Date) => dayFormatter.format(d);
export const normalize = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export function parseCOP(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(value) ? value : null;
  const v = String(value ?? '').trim().replace(/COP|pesos?|\$|\s/gi, '');
  if (!v || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,0{1,2})?$/.test(v)) return null;
  const amount = Number(v.replace(/\./g, '').replace(/,0{1,2}$/, ''));
  return Number.isSafeInteger(amount) ? amount : null;
}
export function dateRange(days: number, end = colombiaDay(new Date())) {
  const start = new Date(`${end}T12:00:00-05:00`); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: colombiaDay(start), to: end };
}
export function comparisonRange(from:string,to:string){
 if(from!==to&&from.endsWith('-01')&&from.slice(0,7)===to.slice(0,7)){
  const [year,month]=from.split('-').map(Number),last=new Date(Date.UTC(year,month,0,17)).getUTCDate();
  const previousStart=new Date(Date.UTC(year,month-2,1,17)).toISOString().slice(0,10),previousLast=new Date(Date.UTC(year,month-1,0,17)).getUTCDate();
  const endDay=Number(to.slice(-2))===last?previousLast:Math.min(Number(to.slice(-2)),previousLast);
  return {from:previousStart,to:previousStart.slice(0,8)+String(endDay).padStart(2,'0')};
 }
 const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1,previousTo=new Date(from+'T12:00:00-05:00');previousTo.setUTCDate(previousTo.getUTCDate()-1);return dateRange(days,colombiaDay(previousTo));
}
export function inRange(sale: Sale, from: string, to: string) { const day = colombiaDay(new Date(sale.fecha_venta)); return day >= from && day <= to; }
export function validSales(sales: Sale[], from: string, to: string) { return sales.filter(s => inRange(s, from, to)); }
export function metrics(sales: Sale[], catalog: CatalogPost[], from: string, to: string) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const prev = comparisonRange(from,to);
  // Convert each timestamp once, including at Colombia's midnight boundary.
  const current: Sale[] = [], previous: Sale[] = [], saleDays = new Map<Sale, string>();
  for (const sale of sales) {
    const day = colombiaDay(new Date(sale.fecha_venta));
    if (day >= from && day <= to) { current.push(sale); saleDays.set(sale, day); }
    else if (day >= prev.from && day <= prev.to) previous.push(sale);
  }
  const total = current.length, pricedOrders=current.filter(s=>s.importe_cop!==null).length, pendingTotals=total-pricedOrders, value = current.reduce((a, s) => a + (s.importe_cop??0), 0);
  const groups = new Map<string, Sale[]>(), dayGroups = new Map<string,{pedidos:number;valor:number;pricedOrders:number}>(), postDays = new Map<string,Map<string,number>>(), previousPosts=new Map<string,number>();
  for(const s of previous)previousPosts.set(s.post_id,(previousPosts.get(s.post_id)??0)+1);
  for (const s of current) { const group=groups.get(s.post_id);if(group)group.push(s);else groups.set(s.post_id,[s]);const day=saleDays.get(s)!,bucket=dayGroups.get(day)??{pedidos:0,valor:0,pricedOrders:0};bucket.pedidos++;bucket.valor+=s.importe_cop??0;if(s.importe_cop!==null)bucket.pricedOrders++;dayGroups.set(day,bucket);const pd=postDays.get(s.post_id)??new Map<string,number>();pd.set(day,(pd.get(day)??0)+1);postDays.set(s.post_id,pd); }
  const trendDays = Array.from({length: 14}, (_, i) => dateRange(14-i,to).from);
  const posts: PostMetric[] = catalog.map(p => {
    const rows = groups.get(p.post_id) ?? [], amount = rows.reduce((a, s) => a + (s.importe_cop??0), 0),priced=rows.filter(s=>s.importe_cop!==null).length;
    return { ...p, orders: rows.length, value: amount, ticket: priced ? amount / priced : null, pricedOrders:priced,pendingTotals:rows.length-priced,share: total ? rows.length / total * 100 : 0, previous: previousPosts.get(p.post_id)??0, trend: trendDays.map(day => postDays.get(p.post_id)?.get(day)??0) };
  }).sort((a, b) => b.orders - a.orders);
  const daily = Array.from({ length: days }, (_, i) => {
    const day = dateRange(days - i, to).from, bucket=dayGroups.get(day);
    return { day, label: labelFormatter.format(new Date(day+'T12:00:00-05:00')), pedidos: bucket?.pedidos??0, valor: bucket&&bucket.pedidos&&!bucket.pricedOrders?null:bucket?.valor??0 };
  });
  return { current, previous, total, value, pricedOrders,pendingTotals,ticket: pricedOrders ? value / pricedOrders : null, posts, daily, missing: current.filter(s=>!s.post_id).length };
}
export function aggregate(sales: Sale[], field: 'ciudad_normalizada' | 'departamento' | 'linea') {
  const map = new Map<string, { id:string; name: string; orders: number; value: number; pricedOrders:number;pendingTotals:number;department: string }>();
  for (const s of sales) { const name = s[field] || (field==='ciudad_normalizada'?s.ciudad_original:'') || 'Por normalizar';const id=field==='ciudad_normalizada'?`${name}|${normalize(s.departamento)}`:name; const entry = map.get(id) ?? { id,name, orders: 0, value: 0, pricedOrders:0,pendingTotals:0, department: s.departamento }; entry.orders++; entry.value += s.importe_cop??0;if(s.importe_cop===null)entry.pendingTotals++;else entry.pricedOrders++; map.set(id, entry); }
  return [...map.values()].sort((a,b)=>b.orders-a.orders);
}
export function csvCell(value: unknown) { const s = String(value ?? ''); return '"' + (/^(?:[\s\u0000-\u001f]*[=+@\-]|[\t\r\n])/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'; }
export function toCSV(headers: string[], rows: unknown[][]) { return '\uFEFF' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n'); }
