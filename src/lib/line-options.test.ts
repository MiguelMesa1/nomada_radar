import {describe,expect,it} from 'vitest';
import {lineOptions,newLineName} from './line-options';
describe('persistent line options',()=>{
 it('keeps new models distinct and normalizes surrounding whitespace',()=>{
  expect(newLineName(' Pulsar   135 ')).toBe('Pulsar 135');
  const lines=lineOptions(['Pulsar 135']);expect(lines).toContain('Pulsar 135');expect(lines).toContain('Pulsar 180');
 });
 it('rejects duplicates including aliases, case, accents and spaces',()=>{
  for(const name of ['NS',' cupula ','BOXER',' pulsar   135 '])expect(()=>newLineName(name,['Pulsar 135'])).toThrow(/ya existe/);
  expect(lineOptions(['Pulsar 135','pulsar 135','NS','Sin línea'])).toHaveLength(lineOptions(['Pulsar 135']).length);
 });
 it('rejects missing names and placeholders',()=>{
  for(const name of [null,'','  ','Sin linea','x'.repeat(121)])expect(()=>newLineName(name)).toThrow();
 });
});
