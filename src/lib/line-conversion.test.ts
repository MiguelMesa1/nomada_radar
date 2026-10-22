import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {lineConversion,filterLineConversion,lineConversionCSV} from './line-conversion';
import type {CatalogPost,Sale,Snapshot} from './types';
const post=(id:string,producto='NS'):CatalogPost=>({post_id:id,producto,nombre_creativo:id,campana:'',plataforma:'Otra',activo:true,fecha_inicio:''});
const sale=(id:string,linea='NS'):Sale=>({pedido_id:id,post_id:id,linea,fecha_venta:'2026-10-10T12:00:00-05:00',ciudad_original:'',ciudad_normalizada:'',departamento:'',importe_cop:null,estado:'confirmado'});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T17:00:00Z'))});
afterEach(()=>vi.useRealTimers());
const range={from:'2026-10-01',to:'2026-10-31'};
const snapshot:Snapshot={catalog:[post('A'),post('B'),post('C'),post('D','XTZ125')],sales:[sale('A'),sale('B'),sale('C'),sale('D','XTZ125'),sale('','NS')],interactions:[{post_id:'A',mes:'2026-10',interacciones:10},{post_id:'B',mes:'2026-10',interacciones:90},{post_id:'D',mes:'2026-10',interacciones:5}],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
describe('conversion by line',()=>{
 it.each([true,false])('keeps six individual unclassified sales even with one grouped Post ID (Sin ID: %s)',mixed=>{
  const sales=Array.from({length:6},(_,i)=>({...sale(mixed&&i>0?'':'A',''),pedido_id:`source-row-${i+2}`}));
  const rows=lineConversion({...snapshot,catalog:[post('A','')],sales,interactions:[]},range);
  const detail=rows.find(row=>row.name==='Sin línea')!;
  expect(detail.orders).toBe(6);
  expect(detail.posts).toHaveLength(1);
  expect(detail.sales).toHaveLength(6);
  expect(new Set(detail.sales.map(row=>row.pedido_id)).size).toBe(6);
  expect(detail.withoutIdOrders).toBe(mixed?5:0);
 });
 it('keeps Sin ID sales valid without conversion or pending classification',()=>{
  const rows=lineConversion({...snapshot,catalog:[],sales:[sale('','Otra marca')],interactions:[]},range);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({name:'Otra marca',orders:1,eligibleOrders:0,pendingOrders:0,withoutIdOrders:1,rate:null});
  expect(rows[0].sales).toEqual([sale('','Otra marca')]);
 });
 it('follows a corrected Post ID line and retains its source sale line for checking',()=>{
  const rows=lineConversion({...snapshot,catalog:[post('A','Accesorios')],sales:[sale('A','Otra marca')],interactions:[]},range);
  expect(rows[0].name).toBe('Accesorios');
  expect(rows[0].sales[0].linea).toBe('Otra marca');
 });
 it('uses a weighted rate and exposes uncovered orders without inflating conversion',()=>{
  const rows=lineConversion(snapshot,range),ns=rows.find(row=>row.name==='NS 200')!;
  expect(ns).toMatchObject({orders:4,eligibleOrders:2,pendingOrders:1,withoutIdOrders:1,interactions:100,rate:2});
  expect(ns.sales).toHaveLength(4);
  expect(ns.sales.filter(sale=>!sale.post_id)).toHaveLength(1);
  expect(filterLineConversion(rows).map(row=>row.name)).toEqual(['XTZ 125','NS 200']);
  expect(filterLineConversion(rows,'xtz','XTZ 125')).toHaveLength(1);
  expect(lineConversionCSV([ns])).toContain('"NS 200";"4";"2";"1";"1";"100";"2"');
 });
 it('does not apply a monthly denominator to a day and preserves sales for validation',()=>{
  const ns=lineConversion(snapshot,{from:'2026-10-10',to:'2026-10-10'}).find(row=>row.name==='NS 200');
  expect(ns).toMatchObject({orders:4,eligibleOrders:0,pendingOrders:3,withoutIdOrders:1,interactions:null,rate:null});
 });
 it('uses dated interactions for a day and keeps zero denominators pending',()=>{
  const rows=lineConversion({...snapshot,dailyInteractions:[{mes:'2026-10',sin_fecha:0,rows:[{fecha:'2026-10-10',post_id:'A',interacciones:4}]}]},{from:'2026-10-10',to:'2026-10-10'});
  expect(rows.find(row=>row.name==='NS 200')).toMatchObject({orders:4,eligibleOrders:1,pendingOrders:2,withoutIdOrders:1,interactions:4,rate:25});
 });
 it('includes uncatalogued IDs and interaction-only publications without losing activity',()=>{
  const rows=lineConversion({...snapshot,catalog:[],sales:[sale('A')],interactions:[{post_id:'A',mes:'2026-10',interacciones:2},{post_id:'Z',mes:'2026-10',interacciones:10}]},range);
  expect(rows.find(row=>row.name==='NS 200')).toMatchObject({orders:1,rate:50});
  expect(rows.find(row=>row.name==='Sin línea')).toMatchObject({orders:0,interactions:10,rate:0});
 });
 it('keeps rates over 100 percent visible for review and returns no artificial activity',()=>{
  expect(lineConversion({...snapshot,catalog:[post('A')],sales:[sale('A'),{...sale('A'),pedido_id:'A2'}],interactions:[{post_id:'A',mes:'2026-10',interacciones:1}]},range)[0].rate).toBe(200);
  expect(lineConversion({...snapshot,sales:[],interactions:[]},range)).toEqual([]);
 });
});
