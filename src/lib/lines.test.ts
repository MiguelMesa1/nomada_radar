import { describe, expect, it } from 'vitest';
import { lineId,lineMetrics, linesCSV } from './lines';
import type { Sale } from './types';

const sale: Sale = { pedido_id: '1', fecha_venta: '2026-10-15T12:00:00-05:00', post_id: '', ciudad_original: 'La Unión', ciudad_normalizada: 'La Unión', departamento: 'Antioquia', importe_cop: 100000, estado: 'confirmado', linea: 'AKT' };

describe('Ventas por línea / marca', () => {
  it('groups all six empty or placeholder lines under the same selectable key',()=>{
    const sales=['',' ','Sin línea','sin linea','SIN LÍNEA',' Sin Linea '].map((linea,i)=>({...sale,pedido_id:String(i),linea}));
    expect(new Set(sales.map(lineId))).toEqual(new Set(['missing']));
    expect(lineMetrics(sales,[])).toMatchObject([{id:'missing',name:'Sin línea',orders:6}]);
    expect(sales.filter(row=>lineId(row)==='missing')).toHaveLength(6);
  });
  it('agrupa variantes de una marca y compara contra el periodo anterior', () => {
    const [brand] = lineMetrics([sale, { ...sale, pedido_id: '2', linea: ' akt ', importe_cop: null }], [{ ...sale, linea: 'akt' }]);
    expect(brand).toMatchObject({ name: 'AKT', orders: 2, value: 100000, ticket: 100000, pricedOrders: 1, pendingTotals: 1, previousOrders: 1, change: 100, share: 100 });
  });
  it('conserva ventas sin marca, sin ciudad y sin importe sin inventar valores', () => {
    const [brand] = lineMetrics([{ ...sale, linea: ' ', importe_cop: null, ciudad_original: '', ciudad_normalizada: '' }], []);
    expect(brand).toMatchObject({ id: 'missing', orders: 1, ticket: null, change: null, cityCount: 0 });
    expect(brand.topCity).toBeUndefined();
    expect(brand.cities[0].orders).toBe(1);
    expect(lineMetrics([], [sale])).toEqual([]);
  });
  it('distingue ciudades homónimas y calcula ticket con importes conocidos incluido cero', () => {
    const [brand] = lineMetrics([sale, { ...sale, pedido_id: '2', departamento: 'Valle del Cauca', importe_cop: 0 }], []);
    expect(brand.cityCount).toBe(2);
    expect(brand.ticket).toBe(50000);
    expect(brand.cities.map(c => c.orders)).toEqual([1, 1]);
  });
  it('exporta solamente la marca seleccionada con todos sus destinos y participación global', () => {
    const current = [sale, { ...sale, pedido_id: '2', linea: 'Yamaha' }, { ...sale, pedido_id: '3', departamento: 'Valle del Cauca', importe_cop: null }];
    const csv = linesCSV(current, [], 'line:akt');
    expect(csv).not.toContain('Yamaha');
    expect(csv).toContain('Antioquia');
    expect(csv).toContain('Valle del Cauca');
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(lineMetrics(current, [])[0].share).toBeCloseTo(200 / 3);
    expect(linesCSV(current, [], 'line:absent').split('\r\n')).toHaveLength(1);
  });
});
