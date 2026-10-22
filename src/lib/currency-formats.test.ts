import {describe,it,expect} from 'vitest';
import {parseCOP,metrics} from './analytics';
import {parsePush,pushHeaders} from './sheets-push';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

describe('COP formats from handwritten Sheets totals',()=>{
 it('keeps the generated receiver price parser valid and equivalent to the app parser',()=>{
  const bundle=readFileSync('functions/sheets-push.bundle.mjs','utf8');
  const source=bundle.slice(bundle.indexOf('function parseCOP('),bundle.indexOf('function dateRange('));
  const deployedParser=runInNewContext(source+'\nparseCOP;') as typeof parseCOP;
  for(const value of ['524.000 pesos','COP $ 524,000.00','524 000','524 mil','1,15 millones','1 millón de pesos','524 pesos 000','524.000 y 145.000 pesos'])expect(deployedParser(value)).toBe(parseCOP(value));
 });
 it.each([
  ['524.000 pesos',524000],['524.000 PESOS',524000],['$524.000',524000],['COP $ 524.000',524000],['COL$ 524.000',524000],['524.000 pesos colombianos',524000],
  ['524000',524000],['524.000,00',524000],['524000,0',524000],['524,000',524000],['524,000.00',524000],['524000.00',524000],
  ['524 000',524000],['524\u00a0000 COP',524000],['524\u202f000,00 pesos',524000],['1.524.000,00',1524000],['1,524,000.00',1524000],['1 524 000.00',1524000],
  ['524 mil',524000],['524k',524000],['524,5 mil pesos',524500],['1,5 millones',1500000],['1.15 millones COP',1150000],['1 millón de pesos',1000000],['1 millón',1000000],
  ['$ 0,00 pesos',0],['0.00',0],['0,000',0],[0,0],['9007199254740991',Number.MAX_SAFE_INTEGER]
 ])('reads %s exactly as integer COP', (input,expected)=>expect(parseCOP(input)).toBe(expected));
 it.each([
  '',null,undefined,'pendiente','por confirmar','USD 524,000','524.000 dolares','524.000 y 145.000 pesos','524000 145000','524 pesos 000',
  '52 4000','52,40,00','524.000.00','524,000,00','1.234,56','1234.56','524000,50',524000.5,'-524.000','(524.000)','1e6','5M','1.524 millones',
  '524000 + envío','524000 / 145000','1/2','9007199254740992','9999999999999999 mil',Infinity,NaN,true,{},[524000], '1'.repeat(101)
 ])('rejects ambiguous, fractional or invalid input %s',input=>expect(parseCOP(input)).toBeNull());
 it('imports mixed formats into the same totals while keeping blanks pending',()=>{
  const amounts=['524.000 pesos','COP $ 524,000.00','524\u00a0000','524 mil',null,0];
  const batch=parsePush({version:1,sheets:[{spreadsheetId:'fixture_currency_formats_2026',sheetId:0,name:'Ventas',rows:[pushHeaders,...amounts.map(amount=>['2026-10-16','A','Bogotá','Cundinamarca',amount,'Pulsar 180',null])]}]});
  const result=metrics(batch.sales,[],'2026-10-16','2026-10-16');
  expect(batch.sales.map(sale=>sale.importe_cop)).toEqual([524000,524000,524000,524000,null,0]);
  expect(result).toMatchObject({total:6,value:2096000,pricedOrders:5,pendingTotals:1,ticket:419200});
 });
});
