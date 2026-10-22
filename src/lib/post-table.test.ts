import {describe,it,expect,vi,afterEach} from 'vitest';
import {sortPostMetrics} from './post-table';
import type {PostMetric} from './types';
afterEach(()=>vi.useRealTimers());
const base:PostMetric={post_id:'A',nombre_creativo:'A',producto:'XTZ 125',campana:'',plataforma:'Otra',fecha_inicio:'',activo:true,orders:4,value:400,pricedOrders:4,pendingTotals:0,ticket:100,share:40,trend:[...Array(7).fill(0),...Array(7).fill(1)],previous:0};
const posts=[base,{...base,post_id:'B',producto:'Pulsar 180',orders:2,value:600,ticket:300,share:20,pricedOrders:2,trend:[...Array(7).fill(2),...Array(7).fill(0)]},{...base,post_id:'C',producto:'Superlander',orders:3,value:0,ticket:null,pricedOrders:0,pendingTotals:3,share:30,activo:false,trend:Array(14).fill(0)},{...base,post_id:'D',producto:'Accesorios',orders:0,value:0,ticket:null,pricedOrders:0,share:0,trend:Array(14).fill(0)}];
const context={sales:[],range:{from:'2026-10-01',to:'2026-10-16'},interactions:[{post_id:'A',mes:'2026-10',interacciones:20},{post_id:'B',mes:'2026-10',interacciones:4},{post_id:'D',mes:'2026-10',interacciones:0}]};
function sorted(key:string,direction:'asc'|'desc'='desc'){vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T17:00:00Z'));return sortPostMetrics(posts,context,key,direction).map(post=>post.post_id);}
describe('Sortable Post ID columns',()=>{
 it.each([
  ['id',['D','C','B','A']],['line',['A','C','B','D']],['orders',['A','C','B','D']],
  ['interactions',['A','B','D','C']],['conversion',['B','A','C','D']],['value',['B','A','D','C']],
  ['ticket',['B','A','C','D']],['share',['A','C','B','D']],['trend',['A','C','D','B']],['status',['D','C','A','B']]
 ])('orders the %s column with deterministic ties', (key,expected)=>expect(sorted(key as string)).toEqual(expected));
 it('reverses numeric order while keeping unavailable values after real zeros',()=>{
  expect(sorted('orders','asc')).toEqual(['D','B','C','A']);
  expect(sorted('conversion','asc')).toEqual(['A','B','C','D']);
  expect(sorted('interactions','asc')).toEqual(['D','B','A','C']);
  expect(sorted('value','asc')).toEqual(['D','A','B','C']);
  expect(posts.map(post=>post.post_id)).toEqual(['A','B','C','D']);
 });
});
