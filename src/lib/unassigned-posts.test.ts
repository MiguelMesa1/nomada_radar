import {describe,it,expect} from 'vitest';
import {unassignedPosts,unassignedPostLinks} from './unassigned-posts';
import {buildLineAssignment} from './line-assignment';
import type {CatalogPost,Sale,Snapshot} from './types';
import type {MetaAd} from './meta-ad-data';
const post=(id:string,producto=''):CatalogPost=>({post_id:id,producto,nombre_creativo:id,campana:'',plataforma:'Otra',activo:true,fecha_inicio:''});
const ad=(id:string):MetaAd=>({id,name:'Anuncio '+id,facebookUrl:'https://www.facebook.com/100/posts/200',instagramUrl:null,frequency:null,impressions:null,reach:null});
const snapshot:Snapshot={catalog:[post('BLANK'),post('KNOWN','NS 200'),post('OTHER','Otra marca')],sales:[{post_id:'SALE',linea:'XTZ 125'} as Sale,{post_id:'',linea:''} as Sale],interactions:[{post_id:'INTERACTION',mes:'2026-10',interacciones:5}],dailyInteractions:[{mes:'2026-10',sin_fecha:0,rows:[{post_id:'DAY',fecha:'2026-10-28',interacciones:2}]}],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
describe('unassigned Post IDs queue',()=>{
 it('only includes IDs with positive Excel counts, excluding catalogue-only, sales-only and Meta-only IDs',()=>{
  expect(unassignedPosts(snapshot,[ad('BLANK'),ad('META'),ad('KNOWN')]).map(post=>post.post_id)).toEqual(['DAY','INTERACTION']);
  expect(snapshot.catalog[0].nombre_creativo).toBe('BLANK');
 });
 it('uses verified links, prefers manual links and rejects unsafe URLs without guessing links from IDs',()=>{
  const entry={...post('A'),publicacion_url:'https://instagram.com/p/manual/',meta:{...ad('A'),instagramUrl:'https://instagram.com/p/meta/'}};
  expect(unassignedPostLinks(entry).map(link=>link.url)).toEqual(['https://instagram.com/p/manual/','https://www.facebook.com/100/posts/200']);
  expect(unassignedPostLinks({...post('12345'),publicacion_url:'javascript:alert(1)'})).toEqual([]);
 });
 it('enriches a counted Excel ID with its Meta link and removes it after assignment',()=>{
  const counted={...snapshot,catalog:[],sales:[],interactions:[{post_id:'META',mes:'2026-10',interacciones:3}],dailyInteractions:[]};
  const entry=unassignedPosts(counted,[ad('META')])[0];
  const assigned=buildLineAssignment(entry,[],'NS','2026-10-28');
  expect(assigned).toMatchObject({method:'POST',post:{post_id:'META',producto:'NS 200',publicacion_url:'https://www.facebook.com/100/posts/200'}});
  expect(unassignedPosts({...counted,catalog:[assigned.post]},[ad('META')])).toEqual([]);
 });
 it('includes inactive posts with missing assignments without treating an inferred sales line as saved catalogue metadata',()=>{
  expect(unassignedPosts({...snapshot,catalog:[{...post('A','Sin línea'),activo:false}],sales:[{post_id:'A',linea:'NS 200'} as Sale],interactions:[{post_id:'A',mes:'2026-10',interacciones:1}],dailyInteractions:[]})).toMatchObject([{post_id:'A',producto:'Sin línea',activo:false}]);
 });
 it('ignores zero counts and blank IDs, deduplicates monthly/daily counts and excludes assigned lines',()=>{
  const rows=['ZERO','INTERACTION','KNOWN','OTHER',' '].map(post_id=>({post_id,mes:'2026-10',interacciones:post_id==='ZERO'?0:2}));
  expect(unassignedPosts({...snapshot,interactions:rows,dailyInteractions:[{mes:'2026-10',sin_fecha:0,rows:[{post_id:'INTERACTION',fecha:'2026-10-28',interacciones:2},{post_id:'DAY-ZERO',fecha:'2026-10-28',interacciones:0}]}]}).map(post=>post.post_id)).toEqual(['INTERACTION']);
 });
 it('starts empty without Excel counts and adds an old Meta ID when its first count arrives',()=>{
  const empty={...snapshot,interactions:[],dailyInteractions:[]};
  const ads=Array.from({length:1321},(_,i)=>ad(String(i)));
  expect(unassignedPosts(empty,ads)).toEqual([]);
  expect(unassignedPosts({...empty,interactions:[{post_id:'123',mes:'2026-10',interacciones:1}]},ads)).toMatchObject([{post_id:'123',nombre_creativo:'Anuncio 123'}]);
 });
});
