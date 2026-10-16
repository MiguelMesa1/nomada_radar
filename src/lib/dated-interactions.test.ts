import {describe,it,expect} from 'vitest';
import {parseDatedInteractions} from './dated-interactions';
import {conversionForPost} from './conversion';
describe('Dated interaction source',()=>{
 const headers=['# ID','Mes','Fecha'];
 it('accepts the new date-only format without shifting its day',()=>{
  expect(parseDatedInteractions([headers,['A','Octubre','2026-10-16']],2026)[9].rows).toEqual([{post_id:'A',fecha:'2026-10-16',interacciones:1}]);
 });
 it('keeps the actual Colombia day for ISO timestamps including UTC midnight boundaries',()=>{
  const months=parseDatedInteractions([headers,['A','Octubre','2026-10-14T19:07:22-05:00'],['A','Octubre','2026-10-15T02:00:00Z'],['A','Octubre','2026-10-14T23:30:00-05:00']],2026);
  expect(months[9]).toMatchObject({mes:'2026-10',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-10-14',interacciones:3}]});
  expect(months).toHaveLength(12);
 });
 it('counts each repeated incoming ID separately and uses Fecha as the source of its month',()=>{
  const month=parseDatedInteractions([headers,['A','Noviembre','2026-10-14T19:07:22-05:00'],['A','Octubre','15/10/2026']],2026)[9];
  expect(month.rows).toHaveLength(2);expect(month.rows.reduce((n,r)=>n+r.interacciones,0)).toBe(2);
  expect(conversionForPost('A',1,[],{from:'2026-10-14',to:'2026-10-14'},[month])).toEqual({interactions:1,rate:100});
 });
 it('keeps undated historical entries as missing dates and refuses to invent daily conversion',()=>{
  const month=parseDatedInteractions([headers,['A','Octubre',''],['A','Octubre','2026-10-14T19:07:22-05:00']],2026)[9];
  expect(month.sin_fecha).toBe(1);
  expect(conversionForPost('A',1,[],{from:'2026-10-14',to:'2026-10-14'},[month]).rate).toBeNull();
 });
 it('rejects invalid dates, missing IDs, cross-year rows and preserves compatibility without Fecha',()=>{
  expect(()=>parseDatedInteractions([headers,['A','Octubre','2026-02-31']],2026)).toThrow('Fecha inválida');
  expect(()=>parseDatedInteractions([headers,['','Octubre','2026-10-14']],2026)).toThrow('sin Post ID');
  expect(()=>parseDatedInteractions([headers,['A','Enero','2027-01-01']],2026)).toThrow('fuera del año');
  expect(parseDatedInteractions([['# ID','Mes'],['A','Octubre']],2026)).toEqual([]);
 });
});
