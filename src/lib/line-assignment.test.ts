import {describe,expect,it} from 'vitest';
import {buildLineAssignment} from './line-assignment';
import {postLine,saleLine} from './classification';
import type {CatalogPost,Sale} from './types';
const target:CatalogPost={post_id:'A',producto:'Sin línea',nombre_creativo:'Original',campana:'Campaña',plataforma:'Facebook',activo:false,fecha_inicio:'2026-01-01'};
describe('inline Post ID classification',()=>{
 it('updates an existing entry and preserves its metadata',()=>{
  const result=buildLineAssignment({...target,nombre_creativo:'Synthetic'},[target],'Boxer','2026-10-19');
  expect(result).toEqual({method:'PATCH',post:{...target,producto:'Boxer CT 100'}});
  expect(result.post).not.toHaveProperty('marca');
  expect(target.producto).toBe('Sin línea');
 });
 it('creates a missing catalogue entry for an interaction-only Post ID',()=>{
  expect(buildLineAssignment({...target,post_id:'z',nombre_creativo:'',fecha_inicio:'',activo:true},[],'NS','2026-10-19')).toMatchObject({method:'POST',post:{post_id:'Z',producto:'NS 200',nombre_creativo:'Z',fecha_inicio:'2026-10-19'}});
 });
 it('rejects empty, placeholder and overlong lines',()=>{
  for(const value of ['', 'Sin linea', 'Sin línea','a'.repeat(121)])expect(()=>buildLineAssignment(target,[],value,'2026-10-19')).toThrow();
 });
 it('uses saved classification for unclassified sales without overwriting known sale lines',()=>{
  const updated=buildLineAssignment(target,[target],'XTZ125','2026-10-19').post;
  const sale={post_id:'A',linea:'Sin línea'} as Sale;
  expect(postLine(target,[sale])).toBe('Sin línea');
  expect(postLine(updated,[sale])).toBe('XTZ 125');
  expect(saleLine(sale,[updated])).toBe('XTZ 125');
  expect(saleLine({...sale,linea:'Pulsar'},[updated])).toBe('Pulsar 180');
 });
});
