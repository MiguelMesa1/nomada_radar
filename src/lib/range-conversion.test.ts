import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {conversionForPost} from './conversion';
import {periodLabel} from './report-period';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-12-19T17:00:00Z'))});
afterEach(()=>vi.useRealTimers());
describe('conversion for custom date ranges',()=>{
 it('counts only the selected dates and Post ID, never a fraction of a monthly total',()=>{
  const result=conversionForPost('A',2,[{post_id:'A',mes:'2026-10',interacciones:999}],{from:'2026-10-10',to:'2026-10-12'},[{mes:'2026-10',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-10-09',interacciones:100},{post_id:'A',fecha:'2026-10-10',interacciones:4},{post_id:'A',fecha:'2026-10-12',interacciones:6},{post_id:'A',fecha:'2026-10-13',interacciones:100},{post_id:'B',fecha:'2026-10-11',interacciones:200}]}]);
  expect(result).toEqual({interactions:10,rate:20});
 });
 it('combines partial boundary months with full monthly counts without double counting',()=>{
  expect(conversionForPost('A',6,[{post_id:'A',mes:'2026-10',interacciones:500},{post_id:'A',mes:'2026-11',interacciones:40},{post_id:'A',mes:'2026-12',interacciones:500}],{from:'2026-10-30',to:'2026-12-02'},[
   {mes:'2026-10',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-10-30',interacciones:10}]},
   {mes:'2026-11',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-11-10',interacciones:40}]},
   {mes:'2026-12',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-12-02',interacciones:10}]}
  ])).toEqual({interactions:60,rate:10});
 });
 it('sums complete historical months without requiring daily records',()=>{
  expect(conversionForPost('A',3,[{post_id:'A',mes:'2026-10',interacciones:10},{post_id:'A',mes:'2026-11',interacciones:20}],{from:'2026-10-01',to:'2026-11-30'})).toEqual({interactions:30,rate:10});
 });
 it('does not manufacture a denominator when a boundary month lacks dated coverage',()=>{
  expect(conversionForPost('A',1,[{post_id:'A',mes:'2026-10',interacciones:100}],{from:'2026-10-01',to:'2026-10-02'})).toEqual({interactions:null,rate:null});
  expect(conversionForPost('A',1,[],{from:'2026-10-01',to:'2026-10-02'},[{mes:'2026-10',sin_fecha:1,rows:[]}])).toEqual({interactions:null,rate:null});
 });
 it('distinguishes zero interactions from missing coverage',()=>{
  expect(conversionForPost('A',1,[],{from:'2026-10-01',to:'2026-10-02'},[{mes:'2026-10',sin_fecha:0,rows:[]}])).toEqual({interactions:0,rate:null});
 });
 it('shows explicit dates for a custom range starting on the first day',()=>{
  const label=periodLabel('2026-10-01','2026-10-12','Fechas');
  expect(label).toContain('al');expect(label).toContain('12');
 });
});
