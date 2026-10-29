import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mock=vi.hoisted(()=>({catalog:vi.fn(),insights:vi.fn(),cache:new Map<string,unknown>()}));
vi.mock('./meta-ads',()=>({loadMetaCatalog:mock.catalog,loadMetaInsights:mock.insights}));
vi.mock('next/cache',()=>({unstable_cache:(fn:(...args:unknown[])=>Promise<unknown>,keys:string[])=>async(...args:unknown[])=>{
 const key=JSON.stringify([keys,args]);if(mock.cache.has(key))return mock.cache.get(key);
 const result=await fn(...args);mock.cache.set(key,result);return result;
}}));
import {cachedMetaReport} from './meta-ads-cache';
import {AppError} from './errors';
const ad={id:'A',name:'Anuncio A',facebookUrl:'https://facebook.com/100/posts/200',instagramUrl:null,frequency:null,impressions:null,reach:null};
beforeEach(()=>{vi.clearAllMocks();mock.cache.clear();mock.catalog.mockResolvedValue([ad]);mock.insights.mockImplementation(async(_account,from)=>[{...ad,name:'A',facebookUrl:null,frequency:from.endsWith('28')?2.8:2.9}])});
describe('independent Meta catalog and daily metric caches',()=>{
 it('shares simultaneous catalog and same-day insight requests',async()=>{
  await Promise.all([cachedMetaReport('123','2026-10-29','2026-10-29'),cachedMetaReport('123','2026-10-29','2026-10-29')]);
  expect(mock.catalog).toHaveBeenCalledOnce();expect(mock.insights).toHaveBeenCalledOnce();
 });
 it('does not reread the ad catalog when switching from the 28th to the 29th',async()=>{
  expect((await cachedMetaReport('123','2026-10-28','2026-10-28')).ads[0]).toMatchObject({frequency:2.8,facebookUrl:ad.facebookUrl});
  expect((await cachedMetaReport('123','2026-10-29','2026-10-29')).ads[0].frequency).toBe(2.9);
  await cachedMetaReport('123','2026-10-28','2026-10-28');
  expect(mock.catalog).toHaveBeenCalledOnce();expect(mock.insights).toHaveBeenCalledTimes(2);
 });
 it('returns the selected day metrics with a warning when catalog calls are limited, sharing the cooldown across days',async()=>{
  mock.catalog.mockRejectedValue(new AppError('Meta limitó las consultas.',429,300));
  const report=await cachedMetaReport('123','2026-10-29','2026-10-29');
  expect(report).toMatchObject({catalogAvailable:false,ads:[{id:'A',frequency:2.9}]});expect(report.warning).toContain('Meta limitó');
  await cachedMetaReport('123','2026-10-28','2026-10-28');expect(mock.catalog).toHaveBeenCalledOnce();
 });
 it('never replaces missing daily metrics with the previous day metrics',async()=>{
  await cachedMetaReport('123','2026-10-28','2026-10-28');
  mock.insights.mockRejectedValue(new AppError('Meta limitó las consultas.',429,300));
  await expect(cachedMetaReport('123','2026-10-29','2026-10-29')).rejects.toMatchObject({status:429,retryAfter:300});
 });
});
