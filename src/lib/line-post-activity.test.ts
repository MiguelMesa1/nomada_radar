import {describe,it,expect,vi,afterEach} from 'vitest';
import {linePostActivity} from './line-post-activity';
import type {PostMetric} from './types';
const post=(id:string,line='Cúpula'):PostMetric=>({post_id:id,producto:line,nombre_creativo:id,campana:'',plataforma:'Otra',activo:true,fecha_inicio:'2026-10-01',orders:0,value:0,ticket:null,pricedOrders:0,pendingTotals:0,share:0,trend:[],previous:0});
afterEach(()=>vi.useRealTimers());
describe('Line interaction activity',()=>{
 it('includes all five Cupula IDs and their 17 interactions even without a single sale',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T17:00:00Z'));
  const posts=['A','B','C','D','E'].map((id,index)=>post(id,index%2?'cupula':'Cúpula'));
  const counts=[5,4,3,3,2].map((interacciones,index)=>({post_id:posts[index].post_id,mes:'2026-10',interacciones}));
  const rows=linePostActivity([...posts,post('NS','NS')],[],[...counts,{post_id:'NS',mes:'2026-10',interacciones:99}],[],{from:'2026-10-01',to:'2026-10-26'}).filter(row=>row.lineId==='line:cupula');
  expect(rows).toHaveLength(5);expect(rows.reduce((sum,row)=>sum+row.interactions!,0)).toBe(17);
  expect(rows.every(row=>row.post.orders===0&&row.rate===0)).toBe(true);expect(new Set(rows.map(row=>row.line))).toEqual(new Set(['Cúpula']));
 });
 it('uses dated interactions for the selected day rather than the entire monthly count',()=>{
  const rows=linePostActivity([post('A')],[],[{post_id:'A',mes:'2026-10',interacciones:17}],[{mes:'2026-10',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-10-25',interacciones:13},{post_id:'A',fecha:'2026-10-26',interacciones:4}]}],{from:'2026-10-26',to:'2026-10-26'});
  expect(rows[0].interactions).toBe(4);
 });
 it('preserves unavailable interaction counts as missing instead of inventing zero',()=>{
  const rows=linePostActivity([post('A')],[],[{post_id:'A',mes:'2026-10',interacciones:17}],[],{from:'2026-10-25',to:'2026-10-26'});
  expect(rows[0]).toMatchObject({interactions:null,rate:null});
 });
});
