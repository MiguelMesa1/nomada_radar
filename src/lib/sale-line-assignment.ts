import {canonicalLine,isMissingLine} from './classification';
import type {Sale} from './types';
export type SaleLineOverride={pedido_id:string;fecha_venta:string;linea:string};
const identity=(sale:{pedido_id:string;fecha_venta:string})=>`${sale.pedido_id}|${Date.parse(sale.fecha_venta)}`;
export function applySaleLineOverrides(sales:Sale[],overrides:SaleLineOverride[]):Sale[]{
 const lines=new Map(overrides.map(row=>[identity(row),row.linea]));
 return sales.map(sale=>{
  const line=lines.get(identity(sale));
  return !sale.post_id&&line?{...sale,linea_importada:sale.linea_importada??sale.linea,linea:canonicalLine(line)}:sale;
 });
}
export function buildSaleLineAssignment(sale:Sale,value:unknown):SaleLineOverride{
 const linea=canonicalLine(value);
 if(sale.post_id)throw Error('Esta venta tiene Post ID. Cambia la línea de su publicación.');
 if(!sale.pedido_id||!Number.isFinite(Date.parse(sale.fecha_venta)))throw Error('No pudimos identificar la venta. Actualiza el informe.');
 if(isMissingLine(linea)||linea.length>120)throw Error('Selecciona o escribe una línea válida.');
 return {pedido_id:sale.pedido_id,fecha_venta:sale.fecha_venta,linea};
}
