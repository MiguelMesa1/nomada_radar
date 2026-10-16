import {afterEach,describe,expect,it,vi} from 'vitest';
import {canonicalLine,manufacturer,postBrand} from './classification';
import {monthRange,shiftMonth} from './report-period';
import {comparisonRange,parseCOP} from './analytics';
import {conversionForPost} from './conversion';
import {parseInteractionBlocks} from './interaction-import';
import {parsePush,pushHeaders} from './sheets-push';
afterEach(()=>vi.useRealTimers());
describe('Monthly reports and manufacturer classification',()=>{
 it('accepts the owner currency formats without mistaking blanks or invalid amounts for zero',()=>{
  expect(parseCOP('335000 pesos')).toBe(335000);expect(parseCOP('$145.000')).toBe(145000);expect(parseCOP('335000')).toBe(335000);
  expect(parseCOP('COP 335.000,00')).toBe(335000);expect(parseCOP('')).toBeNull();expect(parseCOP('-335000 pesos')).toBeNull();expect(parseCOP('335000 y 145000 pesos')).toBeNull();
 });
 it('defaults to month-to-date and supports complete past months and leap years',()=>{
  expect(monthRange('2026-10','2026-10-16')).toEqual({from:'2026-10-01',to:'2026-10-16'});
  expect(monthRange('2026-09','2026-10-16')).toEqual({from:'2026-09-01',to:'2026-09-30'});
  expect(monthRange('2024-02','2026-10-16').to).toBe('2024-02-29');
  expect(()=>monthRange('2026-13')).toThrow();
  expect(shiftMonth('2026-12',1)).toBe('2027-01');
 });
 it('compares the same monthly cutoff and full months of different lengths',()=>{
  expect(comparisonRange('2026-10-01','2026-10-16')).toEqual({from:'2026-09-01',to:'2026-09-16'});
  expect(comparisonRange('2026-09-01','2026-09-30')).toEqual({from:'2026-08-01',to:'2026-08-31'});
 });
 it('merges Pulsar aliases and separates manufacturer from model with explicit override',()=>{
  expect(canonicalLine(' pulsar ')).toBe('Pulsar 180');
  expect(canonicalLine('PULSAR 180')).toBe('Pulsar 180');
  expect(manufacturer('Pulsar')).toBe('Bajaj');
  expect(manufacturer('XTZ 125')).toBe('Yamaha');
  expect(manufacturer('Accesorios')).toBe('Sin marca');
  expect(postBrand({marca:'Honda',producto:'Accesorios'} as never)).toBe('Honda');
 });
});
describe('Monthly conversion uses matching denominators',()=>{
 it('uses only interactions from the selected month',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
  const counts=[{post_id:'A',mes:'2026-10',interacciones:40},{post_id:'A',mes:'2026-11',interacciones:1000}];
  expect(conversionForPost('A',4,counts,monthRange())).toEqual({interactions:40,rate:10});
  expect(conversionForPost('A',4,counts,{from:'2026-10-10',to:'2026-10-16'})).toEqual({interactions:null,rate:null});
  expect(conversionForPost('A',4,counts,{from:'2026-09-01',to:'2026-09-30'}).rate).toBeNull();
 });
 it('does not turn missing counts into zero and never divides by zero',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
  expect(conversionForPost('A',1,[{post_id:'A',mes:'2026-10',interacciones:0}],monthRange())).toEqual({interactions:0,rate:null});
  expect(conversionForPost('A',1,[],monthRange())).toEqual({interactions:null,rate:null});
 });
});
describe('Monthly interaction blocks from Sheets',()=>{
 const headers=[['INTERACCIONES OCTUBRE',null,null,'INTERACCIONES NOVIEMBRE',null,null,'INTERACCIONES DICIEMBRE'],['Post ID','Interacciones',null,'Post ID','Interacciones',null,'Post ID','Interacciones']];
 it('preserves October, November and December as separate monthly groups',()=>{
  expect(parseInteractionBlocks([...headers,['52629361042420',40,null,'52629361042420',3]],2026)).toEqual([
   {mes:'2026-10',rows:[{post_id:'52629361042420',interacciones:40}]},{mes:'2026-11',rows:[{post_id:'52629361042420',interacciones:3}]},{mes:'2026-12',rows:[]}
  ]);
 });
 it('handles zero, blanks, duplicate identical counts and rejects conflicts or malformed months',()=>{
  expect(parseInteractionBlocks([...headers,['A',0],['A',0],['B','']],2026)[0].rows).toEqual([{post_id:'A',interacciones:0}]);
  expect(()=>parseInteractionBlocks([...headers,['A',1],['A',2]],2026)).toThrow('dos cantidades');
  expect(()=>parseInteractionBlocks([['INTERACCIONES PRUEBA'],['Post ID','Interacciones']],2026)).toThrow('mes válido');
  expect(()=>parseInteractionBlocks([...headers,['A',-1]],2026)).toThrow('inválidas');
 });
 it('validates monthly snapshots while preserving compatibility with sales-only scripts',()=>{
  const sheets=[{spreadsheetId:'spreadsheet_2026_abcdefghijkl',sheetId:0,name:'Ventas',rows:[pushHeaders,['16/10/2026','A','Bogotá','Cundinamarca',null,'Pulsar',null]]}];
  const groups=parseInteractionBlocks([...headers,['A',40]],2026);
  const batch=parsePush({version:1,sheets,interactions:groups});
  expect(batch.interactions).toEqual(groups);expect(batch.sales[0].linea).toBe('Pulsar 180');
  expect(()=>parsePush({version:1,sheets,interactions:[groups[0],groups[0]]})).toThrow('dos bloques');
  expect(parsePush({version:1,sheets}).interactions).toBeUndefined();
 });
});
