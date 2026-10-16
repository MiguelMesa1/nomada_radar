import {describe,it,expect,vi,afterEach} from 'vitest';
import {interactionRanking} from './interaction-ranking';
import {canonicalLine,saleLine} from './classification';
import type {Snapshot,Sale,CatalogPost} from './types';
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs()});
const range={from:'2026-10-01',to:'2026-10-16'};
const post={post_id:'A',nombre_creativo:'Video A',producto:'NS',marca:'',campana:'',plataforma:'Otra',fecha_inicio:'2026-10-01',activo:true} satisfies CatalogPost;
const sale={pedido_id:'1',post_id:'A',linea:'NS',fecha_venta:'2026-10-16T12:00:00-05:00',ciudad_normalizada:'Bogotá',ciudad_original:'Bogotá',departamento:'Cundinamarca',importe_cop:null,estado:'confirmado'} satisfies Sale;
const snapshot={sales:[sale],catalog:[post],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live',interactions:[{post_id:'A',mes:'2026-10',interacciones:5},{post_id:'B',mes:'2026-10',interacciones:40},{post_id:'A',mes:'2026-11',interacciones:900}]} satisfies Snapshot;
describe('Interaction leaders and model resolution',()=>{
 it('ranks received interactions including IDs absent from the catalog and keeps sales and months separate',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T17:00:00Z'));
  const result=interactionRanking(snapshot,range);
  expect(result.map(r=>[r.post.post_id,r.interactions,r.post.orders,r.rate])).toEqual([['B',40,0,0],['A',5,1,20]]);
  expect(interactionRanking(snapshot,range,'Bajaj').map(r=>r.post.post_id)).toEqual(['A']);
 });
 it('does not manufacture monthly counts for an unsupported date interval',()=>{
  expect(interactionRanking(snapshot,{from:'2026-10-10',to:'2026-10-16'})).toEqual([]);
 });
 it('merges Boxer and NS, resolves XTZ from evidence and leaves unrelated ambiguous sales alone',()=>{
  expect(canonicalLine('Boxer')).toBe('Boxer CT 100');expect(canonicalLine('ns')).toBe('NS 200');
  expect(saleLine({...sale,linea:'XTZ'},[{...post,producto:'XTZ 150'}])).toBe('XTZ 150');
  vi.stubEnv('NEXT_PUBLIC_RADAR_XTZ_125_ROW','__fila__:fixture_workbook_2026_abcdefghijkl:0:716');
  const original={...sale,pedido_id:'__fila__:fixture_workbook_2026_abcdefghijkl:0:716',post_id:'',linea:'XTZ',fecha_venta:'2026-10-01T16:56:35-05:00'};
  expect(saleLine(original)).toBe('XTZ 125');
  expect(saleLine({...original,pedido_id:'another-row'})).toBe('XTZ');
  expect(saleLine({...original,fecha_venta:'2026-10-02T21:56:35Z'})).toBe('XTZ');
 });
});
