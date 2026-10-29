import {describe,it,expect} from 'vitest';
import {unknownCatalogPosts,qualitySales} from './quality-review';
import {saleLine} from './classification';
import type {Sale,CatalogPost} from './types';
const sale=(post_id:string,linea='Otra marca'):Sale=>({pedido_id:post_id||'organic',post_id,linea,fecha_venta:'2026-10-28T12:00:00-05:00',ciudad_original:'',ciudad_normalizada:'',departamento:'',importe_cop:null,estado:'confirmado',resumen_pedido:'Cúpula negra para Pulsar'});
const post:CatalogPost={post_id:'A',producto:'Pulsar 180',nombre_creativo:'Ad',campana:'',plataforma:'Facebook',activo:true,fecha_inicio:'2026-10-01'};
describe('quality review and attribution',()=>{
 it('attributes generic Other sales to the known publication line without changing the source',()=>{
  for(const other of ['Otra marca','otra linea','OTRA','Otros']){const original=sale('A',other);expect(saleLine(original,[post])).toBe('Pulsar 180');expect(original.linea).toBe(other);}
  expect(saleLine(sale('A','XTZ 150'),[post])).toBe('XTZ 150');
  expect(saleLine(sale('','Otra marca'),[post])).toBe('Otra marca');
  expect(saleLine(sale('MISSING','Otra marca'),[post])).toBe('Otra marca');
 });
 it('keeps organic untracked sales out of quality while retaining real unclassified sales',()=>{
  const organic=sale(''),unclassified=sale('',''),unknown=sale('X');
  expect(qualitySales([organic,unclassified,unknown])).toEqual([unclassified,unknown]);
  expect(unknownCatalogPosts([organic,unclassified,unknown,sale('A')],[post]).map(row=>row.post.post_id)).toEqual(['X']);
 });
 it('deduplicates unknown IDs, joins exact Meta ads and keeps source summaries for classification',()=>{
  const ad={id:'X',name:'Anuncio de cúpula',facebookUrl:'https://facebook.com/1/posts/2',instagramUrl:null,frequency:1,impressions:3,reach:3};
  const rows=unknownCatalogPosts([sale('X'),sale('X'),sale('Y','NS')],[],[ad]);
  expect(rows[0]).toMatchObject({post:{post_id:'X',nombre_creativo:'Anuncio de cúpula',meta:{id:'X'}},orders:2,suggestedLine:'',summaries:['Cúpula negra para Pulsar']});
  expect(rows[1].suggestedLine).toBe('NS 200');
 });
});
