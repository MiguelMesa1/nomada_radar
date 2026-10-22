import {describe,it,expect} from 'vitest';
import {filterCatalog,catalogLineOptions} from './catalog-filter';
import type {CatalogPost,Sale} from './types';
import {locationSales} from './locations';
const post=(post_id:string,producto:string,activo=true):CatalogPost=>({post_id,producto,activo,nombre_creativo:'Video '+post_id,campana:'',plataforma:'Otra',fecha_inicio:'2026-10-01'});
const catalog=[post('EMPTY',''),post('PLACEHOLDER','sin linea',false),post('OTHER','Otra marca'),post('OTHER2',' otra LÍNEA ',false),post('NS','ns'),post('XTZ','XTZ 125',false)];
describe('Catalog filters by assigned line',()=>{
 it('finds unassigned IDs including placeholders regardless of sales or status',()=>{
  expect(filterCatalog(catalog,'','Todos','missing').map(p=>p.post_id)).toEqual(['EMPTY','PLACEHOLDER']);
 });
 it('finds other-line placeholders and combines the filter with status and search',()=>{
  expect(filterCatalog(catalog,'','Todos','other').map(p=>p.post_id)).toEqual(['OTHER','OTHER2']);
  expect(filterCatalog(catalog,'video other','Inactivos','other').map(p=>p.post_id)).toEqual(['OTHER2']);
  expect(filterCatalog(catalog,'','Activos','missing').map(p=>p.post_id)).toEqual(['EMPTY']);
 });
 it('filters canonical named lines, without matching unrelated IDs',()=>{
  expect(filterCatalog(catalog,'','Todos','line:ns 200').map(p=>p.post_id)).toEqual(['NS']);
  expect(filterCatalog(catalog,'nothing','Todos','missing')).toEqual([]);
 });
 it('deduplicates line aliases and leaves placeholders to their dedicated filters',()=>{
  expect(catalogLineOptions([...catalog,post('NS2','NS 200')])).toEqual([{value:'line:ns 200',name:'NS 200'},{value:'line:xtz 125',name:'XTZ 125'}]);
 });
 it('includes the same Other IDs as locations when imported sales differ from the saved line',()=>{
  const posts=[post('PULSAR','Pulsar 180'),post('SUPER','Superlander',false),post('BLANK',''),post('SAVED','Otra marca'),post('UNRELATED','NS 200')];
  const sale=(post_id:string,linea:string)=>({post_id,linea} as Sale);
  const sales=[sale('PULSAR','Otra Marca'),sale('SUPER',' otra LÍNEA '),sale('BLANK','OTRA MARCA'),sale('UNRELATED','NS 200')];
  const ids=filterCatalog(posts,'','Todos','other',sales).map(p=>p.post_id);
  expect(ids).toEqual(['PULSAR','SUPER','BLANK','SAVED']);
  const locationIds=new Set([...locationSales(sales,posts,'Otra marca').map(s=>s.post_id),'SAVED']);
  expect(new Set(ids)).toEqual(locationIds);
  expect(filterCatalog(posts,'','Inactivos','other',sales).map(p=>p.post_id)).toEqual(['SUPER']);
  expect(filterCatalog(posts,'pulsar','Todos','other',sales).map(p=>p.post_id)).toEqual(['PULSAR']);
  expect(posts[0].producto).toBe('Pulsar 180');
 });
 it('keeps saved missing lines distinct and uses only sales supplied for the selected period',()=>{
  const posts=[post('PULSAR','Pulsar 180'),post('BLANK','')];
  expect(filterCatalog(posts,'','Todos','other',[])).toEqual([]);
  expect(filterCatalog(posts,'','Todos','missing',[{post_id:'PULSAR',linea:'Sin línea'} as Sale]).map(p=>p.post_id)).toEqual(['BLANK']);
 });
});
