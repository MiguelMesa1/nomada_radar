import {describe,expect,it} from 'vitest';
import {applySaleLineOverrides,buildSaleLineAssignment} from './sale-line-assignment';
import {lineConversion} from './line-conversion';
import type {Sale,Snapshot} from './types';
const sale:Sale={pedido_id:'__fila__:file:0:1046',post_id:'',fecha_venta:'2026-10-14T17:00:00Z',linea:'Sin línea',importe_cop:null,ciudad_original:'',ciudad_normalizada:'',departamento:'',estado:'confirmado'};
describe('individual sales line assignment',()=>{
 it('assigns only the selected sale and preserves the original row, timestamp and imported line',()=>{
  const input=[sale,{...sale,pedido_id:'other'},{...sale,fecha_venta:'2026-10-15T17:00:00Z'},{...sale,post_id:'A'}];
  const updated=applySaleLineOverrides(input,[buildSaleLineAssignment(sale,'Pulsar')]);
  expect(updated[0]).toEqual({...sale,linea:'Pulsar 180',linea_importada:'Sin línea'});
  expect(updated.slice(1)).toEqual(input.slice(1));expect(sale.linea).toBe('Sin línea');
  expect(applySaleLineOverrides(updated,[buildSaleLineAssignment(sale,'Otra marca')])[0]).toEqual({...sale,linea:'Otra marca',linea_importada:'Sin línea'});
 });
 it('matches equivalent timezone representations after a reload or reimport',()=>{
  expect(applySaleLineOverrides([sale],[{pedido_id:sale.pedido_id,fecha_venta:'2026-10-14T12:00:00-05:00',linea:'Boxer'}])[0].linea).toBe('Boxer CT 100');
 });
 it('rejects invalid assignments and sales that have a Post ID',()=>{
  for(const input of ['', 'Sin línea','a'.repeat(121)])expect(()=>buildSaleLineAssignment(sale,input)).toThrow();
  expect(()=>buildSaleLineAssignment({...sale,post_id:'A'},'NS')).toThrow();
  expect(()=>buildSaleLineAssignment({...sale,pedido_id:''},'NS')).toThrow();
 });
 it('moves the sale between line totals without creating a Post ID or a conversion rate',()=>{
  const snapshot:Snapshot={sales:applySaleLineOverrides([sale],[buildSaleLineAssignment(sale,'XTZ125')]),catalog:[],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
  expect(lineConversion(snapshot,{from:'2026-10-01',to:'2026-10-31'})).toMatchObject([{name:'XTZ 125',orders:1,withoutIdOrders:1,eligibleOrders:0,rate:null,posts:[]}]);
 });
});
