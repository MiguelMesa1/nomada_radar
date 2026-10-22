import {describe,it,expect} from 'vitest';
import {saleSource} from './sale-source';
describe('spreadsheet sale coordinates',()=>{
 it('shows only sheet and row, without publishing a direct file URL',()=>{
  const source=saleSource('__fila__:abcdefghijklmnopqrstuv:456:716');
  expect(source).toEqual({row:716,label:'Hoja 456 · fila 716'});
  expect(JSON.stringify(source)).not.toContain('abcdefghijklmnopqrstuv');
 });
 it('keeps a known legacy row without inventing a file URL',()=>{
  expect(saleSource('__fila__:Octubre:24')).toEqual({row:24,label:'Octubre · fila 24'});
  expect(saleSource('P123')).toBeNull();
  expect(saleSource('__fila__:Octubre:0')).toBeNull();
 });
});
