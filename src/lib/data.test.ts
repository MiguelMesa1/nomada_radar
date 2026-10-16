import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('./server', () => ({
 requireProfile: vi.fn(),
 AppError: class extends Error { constructor(message:string,public status:number) { super(message); } },
}));
import { requireProfile } from './server';
import { loadSnapshot } from './data';

describe('Snapshot loading', () => {
 it('starts sales before the catalog finishes and preserves all paginated orders', async () => {
  let finishCatalog!:(value:unknown)=>void;
  const catalog = new Promise(resolve => { finishCatalog=resolve; });
  const orders=Array.from({length:1000},(_,i)=>({pedido_id:`P${i}`}));
  const range=vi.fn().mockResolvedValueOnce({data:orders}).mockResolvedValueOnce({data:[{pedido_id:'last'}]});
  const salesQuery:any={select:vi.fn(()=>salesQuery),gte:vi.fn(()=>salesQuery),lte:vi.fn(()=>salesQuery),in:vi.fn(()=>salesQuery),order:vi.fn(()=>salesQuery),range};
  const query=(result:unknown)=>{const chain:any={select:()=>chain,order:()=>chain,gte:()=>chain,lte:()=>chain,limit:()=>result,range:()=>Promise.resolve({data:[]})};return chain;};
  const profile={user_id:'user',nombre:'Test',email:'test@example.com',role:'analista' as const,activo:true};
  const from=vi.fn((table:string)=>table==='sales_orders'?salesQuery:query(table==='post_catalog'?catalog:Promise.resolve({data:[]})));
  vi.mocked(requireProfile).mockResolvedValue({profile,client:{database:{from}}} as never);
  const result=loadSnapshot('2026-10-01','2026-10-30');
  await vi.waitFor(()=>expect(range).toHaveBeenCalledTimes(2));
  finishCatalog({data:[]});
  const snapshot=await result;
  expect(snapshot.sales).toHaveLength(1001);
  expect(snapshot.sales.at(-1)?.pedido_id).toBe('last');
  expect(snapshot.profile).toEqual(profile);
  expect(range.mock.calls).toEqual([[0,999],[1000,1999]]);
  expect(salesQuery.gte).toHaveBeenCalledWith('fecha_venta','2026-09-01T00:00:00-05:00');
 });
});
