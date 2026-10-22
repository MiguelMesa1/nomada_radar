import { aggregate, normalize, toCSV } from './analytics';
import type { Sale } from './types';
import { canonicalLine,isMissingLine } from './classification';

export const lineId = (sale: Sale) => isMissingLine(sale.linea) ? 'missing' : `line:${normalize(canonicalLine(sale.linea))}`;

export function lineMetrics(current: Sale[], previous: Sale[]) {
  const groups = new Map<string, Sale[]>();
  const previousCounts = new Map<string, number>();
  for (const sale of previous) previousCounts.set(lineId(sale), (previousCounts.get(lineId(sale)) ?? 0) + 1);
  for (const sale of current) {
    const id = lineId(sale);
    const rows = groups.get(id) ?? [];
    rows.push(sale);
    groups.set(id, rows);
  }
  return [...groups].map(([id, rows]) => {
    const pricedOrders = rows.filter(s => s.importe_cop !== null).length;
    const value = rows.reduce((sum, s) => sum + (s.importe_cop ?? 0), 0);
    const cities = aggregate(rows, 'ciudad_normalizada');
    const knownCities = aggregate(rows.filter(s => s.ciudad_normalizada || s.ciudad_original), 'ciudad_normalizada');
    const previousOrders = previousCounts.get(id) ?? 0;
    return {
      id, name: id === 'missing' ? 'Sin línea' : canonicalLine(rows[0].linea),
      orders: rows.length, value, pricedOrders, pendingTotals: rows.length - pricedOrders,
      ticket: pricedOrders ? value / pricedOrders : null,
      share: current.length ? rows.length / current.length * 100 : 0,
      previousOrders, change: previousOrders ? (rows.length - previousOrders) / previousOrders * 100 : null,
      cities, cityCount: knownCities.length, topCity: knownCities[0],
    };
  }).sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name, 'es'));
}

export function linesCSV(current: Sale[], previous: Sale[], selected = '') {
  return toCSV(
    ['Línea', 'Ventas', 'Valor conocido COP', 'Ticket COP (solo totales conocidos)', 'Participación %', 'Ventas periodo anterior', 'Variación %', 'Ciudades con ventas', 'Ciudad líder', 'Departamento líder', 'Ventas ciudad líder', 'Ventas con total', 'Totales pendientes', 'Ciudad', 'Departamento', 'Ventas en ciudad', 'Participación en línea %', 'Valor conocido ciudad COP', 'Totales pendientes ciudad'],
    lineMetrics(current, previous).filter(b => !selected || b.id === selected).flatMap(b => b.cities.map(c => [
      b.name, b.orders, b.pricedOrders ? b.value : null, b.ticket, b.share, b.previousOrders, b.change,
      b.cityCount, b.topCity?.name, b.topCity?.department, b.topCity?.orders, b.pricedOrders, b.pendingTotals,
      c.name, c.department, c.orders, c.orders / b.orders * 100, c.pricedOrders ? c.value : null, c.pendingTotals,
    ])),
  );
}
