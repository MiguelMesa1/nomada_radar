import { describe,it,expect } from 'vitest';
import { parsePush,pushHeaders } from './sheets-push';
const file='fixture_workbook_2026_abcdefghijkl';
const row=['15/10/2026','POST01','Bogota','Cundinamarca',null,'Nomada',null];
const sheet=(spreadsheetId=file,sheetId=0,name='Octubre',rows:unknown[][]=[pushHeaders,row])=>({spreadsheetId,sheetId,name,rows});
describe('Apps Script full snapshot',()=>{
 it('imports IDs without sales, deduplicates the same model and rejects conflicting models',()=>{
  const item={post_id:'new01',producto:'XTZ 125'};
  const result=parsePush({version:1,sheets:[sheet()],catalog:[item,item]});
  expect(result.catalog).toEqual([{post_id:'NEW01',producto:'XTZ 125'}]);
  expect(()=>parsePush({version:1,sheets:[sheet()],catalog:[item,{...item,producto:'NS 200'}]})).toThrow('dos modelos');
  expect(parsePush({version:1,sheets:[sheet()]}).catalog).toBeUndefined();
  expect(parsePush({version:1,sheets:[sheet()],catalog:[]}).catalog).toEqual([]);
 });
 it('updates month attribution by date without changing annual row identity',()=>{
  const before=parsePush({version:1,sheets:[sheet(file,0,'Ventas')]});
  const after=parsePush({version:1,sheets:[sheet(file,0,'Ventas',[pushHeaders,['15/09/2026',...row.slice(1)]])]});
  expect(before.sales[0].pedido_id).toBe(after.sales[0].pedido_id);
  expect(before.sales[0].fecha_venta).toContain('2026-10-15');
  expect(after.sales[0].fecha_venta).toContain('2026-09-15');
 });
 it('counts separate identical rows and updates the same coordinates on reread',()=>{
  const input={version:1,sheets:[sheet(file,0,'Octubre',[pushHeaders,row,row])]};
  const batch=parsePush(input);expect(batch.sales).toHaveLength(2);
  expect(batch.sales[0].pedido_id).not.toBe(batch.sales[1].pedido_id);
  expect(parsePush(input).sales[0].pedido_id).toBe(batch.sales[0].pedido_id);
 });
 it('separates years, months and preserves identity when a tab is renamed',()=>{
  const batch=parsePush({version:1,sheets:[sheet(),sheet(file,1,'Noviembre'),sheet('another_spreadsheet_2027_abcdef',0,'Octubre')]});
  expect(new Set(batch.sales.map(s=>s.pedido_id)).size).toBe(3);
  expect(parsePush({version:1,sheets:[sheet(file,0,'Octubre 2026')]}).sales[0].pedido_id).toBe(batch.sales[0].pedido_id);
 });
 it('preserves blank rows, pending totals, actual zero and default confirmed state',()=>{
  const batch=parsePush({version:1,sheets:[sheet(file,0,'Octubre',[pushHeaders,row,Array(7).fill(null),[...row.slice(0,4),0,'Nomada','']])]});
  expect(batch.sales.map(s=>s.importe_cop)).toEqual([null,0]);
  expect(batch.sales[1].pedido_id.endsWith(':4')).toBe(true);
  expect(batch.sales[0].estado).toBe('confirmado');
 });
 it('allows a new empty month alongside populated ones',()=>{
  expect(parsePush({version:1,sheets:[sheet(),sheet(file,1,'Noviembre',[pushHeaders])]}).sales).toHaveLength(1);
 });
 it('rejects repeated sources, private extra fields, non-whitelisted columns and partial invalid rows',()=>{
  expect(()=>parsePush({version:1,sheets:[sheet(),sheet()]})).toThrow();
  expect(()=>parsePush({version:1,sheets:[{...sheet(),telefono:'private'}]})).toThrow();
  expect(()=>parsePush({version:1,sheets:[sheet(file,0,'Octubre',[['Nombre',...pushHeaders.slice(1)],row])]})).toThrow();
  expect(()=>parsePush({version:1,sheets:[sheet(file,0,'Octubre',[pushHeaders,row,['imposible',...row.slice(1)]])]})).toThrow();
 });
});
