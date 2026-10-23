import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {loadMetaAds} from './meta-ads';
import {attachMetaAds,metaNumber,formatMetaCost,metaCostValues} from './meta-ad-data';
const fetcher=vi.fn();
beforeEach(()=>{vi.stubGlobal('fetch',fetcher);vi.stubEnv('META_ACCESS_TOKEN','private-test-token');fetcher.mockReset()});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
const ok=(data:unknown,paging?:unknown)=>Response.json({data,paging});
describe('Meta ad reporting',()=>{
 it('paginates safely, joins exact ad IDs and preserves absent metrics as missing',async()=>{
  fetcher.mockImplementation((url:URL,options:RequestInit)=>{
   expect(options.headers).toEqual({Authorization:'Bearer private-test-token'});expect(url.href).not.toContain('private-test-token');
   if(url.pathname.endsWith('/insights'))return ok([{ad_id:'1',frequency:'1.25',impressions:'100',reach:'80',spend:'100.50',cpc:'0.125',cpm:'1.2345',account_currency:'COP'},{ad_id:'archived',ad_name:'Old',frequency:'2',impressions:'20',reach:'10'}]);
   if(url.searchParams.has('after'))return ok([{id:'2',name:'No activity'}]);
   return ok([{id:'1',name:'Ad',creative:{effective_object_story_id:'100_200',instagram_permalink_url:'https://www.instagram.com/p/a/'}}],{next:'https://evil.test/?access_token=do-not-follow',cursors:{after:'cursor2'}});
  });
  const ads=await loadMetaAds('123','2026-01-01','2026-01-31');expect(ads).toHaveLength(3);expect(ads[0]).toMatchObject({id:'1',frequency:1.25,spend:100.5,cpc:0.125,cpm:1.2345,currency:'COP',facebookUrl:'https://www.facebook.com/100/posts/200',instagramUrl:'https://www.instagram.com/p/a/'});expect(ads[1]).toMatchObject({frequency:null,impressions:null,spend:null,cpc:null,cpm:null,currency:null});expect(ads[2]).toMatchObject({id:'archived',frequency:2});expect(fetcher).toHaveBeenCalledTimes(3);
  const original={post_id:'1',publicacion_url:'https://facebook.com/manual'} as never;
  const attached=attachMetaAds([original,{post_id:'11'} as never],ads);expect(attached[0].publicacion_url).toBe('https://facebook.com/manual');expect(attached[0].meta?.id).toBe('1');expect(attached[0].nombre_creativo).toBe('Ad');expect(attached[1].meta).toBeUndefined();expect(original).not.toHaveProperty('meta');
  expect(attachMetaAds([{post_id:'2',nombre_creativo:'2'} as never],ads)[0]).toMatchObject({nombre_creativo:'No activity',meta:{id:'2',frequency:null}});
 });
 it('does not expose tokens or cache partial results after Meta errors',async()=>{
  fetcher.mockImplementation(()=>Promise.resolve(Response.json({error:{code:190,message:'private-test-token'}},{status:400})));await expect(loadMetaAds('123','2026-01-01','2026-01-31')).rejects.toThrow('La conexión con Meta venció. Actualiza el token.');
 });
 it('keeps real zero distinct from missing and rejects invalid numbers',()=>{
  expect(metaNumber('0')).toBe(0);for(const value of [undefined,null,'','abc',-1,Infinity])expect(metaNumber(value)).toBeNull();
 });
 it('formats costs in the account currency without hiding zero or small amounts',()=>{
  expect(formatMetaCost(0,'COP')).toContain('0,00');expect(formatMetaCost(0,'COP')).toContain('COP');
  expect(formatMetaCost(0.125,'COP')).toContain('0,13');expect(formatMetaCost(2.5,'USD')).toContain('USD');
  expect(formatMetaCost(null,'COP')).toBe('Sin dato');expect(formatMetaCost(undefined,'COP')).toBe('Sin dato');expect(formatMetaCost(100,null)).toBe('Sin dato');
  expect(metaCostValues({meta:{currency:'COP',spend:0,cpc:null,cpm:12.125}} as never)).toEqual(['COP',0,null,12.125]);
 });
 it('passes a real zero spend through and leaves a CPC with no clicks unavailable',async()=>{
  fetcher.mockImplementation((url:URL)=>Promise.resolve(url.pathname.endsWith('/ads')?ok([{id:'1',name:'Zero'}]):ok([{ad_id:'1',spend:'0',cpm:'0',account_currency:'COP'}])));
  expect((await loadMetaAds('123','2026-01-01','2026-01-31'))[0]).toMatchObject({spend:0,cpc:null,cpm:0,currency:'COP'});
 });
});
