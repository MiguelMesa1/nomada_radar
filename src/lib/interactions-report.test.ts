import {describe,it,expect,vi,afterEach} from 'vitest';
import {interactionRanking} from './interaction-ranking';
import {filterInteractions,interactionsCSV,summarizeInteractions} from './interactions-report';
import type {CatalogPost,Sale,Snapshot} from './types';
afterEach(()=>vi.useRealTimers());
const post=(id:string,line:string,brand:string):CatalogPost=>({post_id:id,nombre_creativo:id,producto:line,marca:brand,campana:'',plataforma:'Otra',activo:true,fecha_inicio:''});
const sale=(id:string,postId:string):Sale=>({pedido_id:id,post_id:postId,linea:'',fecha_venta:'2026-10-16T12:00:00-05:00',ciudad_original:'Bogotá',ciudad_normalizada:'Bogotá',departamento:'Cundinamarca',importe_cop:null,estado:'confirmado'});
const sales=[sale('1','A'),sale('2','A'),sale('3','B'),sale('4','C'),sale('5','D')];
const snapshot:Snapshot={mode:'live',profile:{user_id:'test',nombre:'Test',email:'',role:'analista',activo:true},runs:[],catalog:[post('A','Pulsar 180','Bajaj'),post('B','XTZ 125','Yamaha'),post('C','Superlander','Superlander'),post('D','NS 200','Bajaj')],sales,interactions:[{post_id:'A',mes:'2026-10',interacciones:10},{post_id:'B',mes:'2026-10',interacciones:90},{post_id:'C',mes:'2026-10',interacciones:0},{post_id:'E',mes:'2026-10',interacciones:20},{post_id:'A',mes:'2026-11',interacciones:9999}]};
function rows(){vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T17:00:00Z'));return interactionRanking(snapshot,{from:'2026-10-01',to:'2026-10-16'});}
describe('Interactions report denominators, filters and exports',()=>{
 it('uses a pooled conversion and excludes sales without a positive matching denominator',()=>{
  const summary=summarizeInteractions(rows(),sales);
  expect(summary.total).toBe(120);expect(summary.orders).toBe(3);expect(summary.rate).toBe(2.5);
  expect(summary.active).toBe(3);expect(summary.withoutSales).toBe(20);expect(summary.salesWithoutInteractions).toBe(1);
  expect(summary.leader?.post.post_id).toBe('B');expect(summary.lines[0]).toEqual({name:'XTZ 125',interactions:90,orders:1});
 });
 it('keeps filter and CSV results consistent, includes uncatalogued IDs and sorts by conversion',()=>{
  const ranked=rows(),filtered=filterInteractions(ranked,sales,'bajaj','','conversion');
  expect(filtered.map(row=>row.post.post_id)).toEqual(['A']);expect(summarizeInteractions(filtered,sales).rate).toBe(20);
  expect(filterInteractions(ranked,sales,'','Superlander')[0].rate).toBeNull();
  expect(filterInteractions(ranked,sales,'','','conversion').map(row=>row.post.post_id)).toEqual(['A','B','E','C']);
  const csv=interactionsCSV(filtered,sales);expect(csv).toContain('"A";"A";"Pulsar 180";"Bajaj";"10";"100";"2";"20"');expect(csv).not.toContain('"B"');
  expect(interactionsCSV(ranked,sales)).toContain('"E";"E";"Sin línea";"Sin marca";"20"');
 });
 it('does not invent zeros or conversion when the selected dates have no matching counts',()=>{
  const missing=interactionRanking(snapshot,{from:'2026-10-10',to:'2026-10-16'});
  expect(missing).toEqual([]);expect(summarizeInteractions(missing,sales)).toMatchObject({total:0,orders:0,rate:null,topThreeShare:null});
 });
});
