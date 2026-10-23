import {beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({meta:vi.fn(),snapshot:vi.fn()}));
vi.mock('@/lib/line-conversion',async()=>await import('./line-conversion'));
vi.mock('@/lib/post-table',async()=>await import('./post-table'));
vi.mock('@/lib/security',()=>({protectRequest:vi.fn(),protectUser:vi.fn()}));
vi.mock('@/lib/locations',async()=>await import('./locations'));
vi.mock('@/lib/lines',async()=>await import('./lines'));
vi.mock('@/lib/analytics',async()=>await import('./analytics'));
vi.mock('@/lib/classification',async()=>await import('./classification'));
vi.mock('@/lib/interaction-ranking',async()=>await import('./interaction-ranking'));
vi.mock('@/lib/interactions-report',async()=>await import('./interactions-report'));
vi.mock('@/lib/conversion',async()=>await import('./conversion'));
vi.mock('@/lib/data',()=>({loadSnapshot:mock.snapshot}));
vi.mock('@/lib/meta-ads-cache',()=>({cachedMetaAds:mock.meta}));
vi.mock('@/lib/meta-ad-data',async()=>await import('./meta-ad-data'));
vi.mock('@/lib/server',async()=>{const {AppError}=await import('./errors');return {requireProfile:vi.fn(async()=>({profile:{user_id:'qa'}})),parseRange:()=>({from:'2026-10-01',to:'2026-10-23'}),failure:(e:InstanceType<typeof AppError>)=>Response.json({error:e.message},{status:e.status})}});
import {GET} from '../app/api/export/route';
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('META_ACCESS_TOKEN','test-token');vi.stubEnv('META_AD_ACCOUNT_ID','123');
 mock.snapshot.mockImplementation(async()=>({catalog:['A','B','C'].map(post_id=>({post_id,nombre_creativo:post_id,producto:'NS 200',campana:'',plataforma:'Otra',activo:true,fecha_inicio:'2026-10-01'})),sales:[],interactions:[],dailyInteractions:[]}));
 mock.meta.mockResolvedValue([{id:'A',name:'Ad A',currency:'COP',spend:100.5,cpc:0.125,cpm:1.2345},{id:'B',name:'Ad B',currency:'COP',spend:0,cpc:null,cpm:0}]);
});
describe('Meta cost CSV export',()=>{
 it('uses the same ad ID, period, numeric sorting and unrounded costs as the report',async()=>{
  const response=await GET(new Request('https://radar.test/api/export?view=post-id&sort=spend&dir=asc'));expect(response.status).toBe(200);expect(mock.meta).toHaveBeenCalledWith('123','2026-10-01','2026-10-23');
  const rows=(await response.text()).split('\r\n').map(row=>row.split(';').map(cell=>cell.replace(/^"|"$/g,'')));
  expect(rows[0].slice(-4)).toEqual(['Moneda Meta','Gasto total Meta','CPC Meta (todos los clics)','CPM Meta']);
  expect(rows.slice(1).map(row=>row[0])).toEqual(['B','A','C']);expect(rows[1].slice(-4)).toEqual(['COP','0','','0']);expect(rows[2].slice(-4)).toEqual(['COP','100.5','0.125','1.2345']);expect(rows[3].slice(-4)).toEqual(['','','','']);
 });
 it('does not query Meta for reports that do not include advertising costs',async()=>{
  const response=await GET(new Request('https://radar.test/api/export?view=inicio'));expect(response.status).toBe(200);expect(mock.meta).not.toHaveBeenCalled();expect(await response.text()).not.toContain('CPC Meta');
 });
});
