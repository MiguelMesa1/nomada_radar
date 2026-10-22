import {describe,it,expect,vi,afterEach} from 'vitest';
import {interactionTimeline} from './interaction-timeline';
import {dayRange,shiftDay,periodLabel} from './report-period';
import {comparisonRange} from './analytics';
import {interactionRanking} from './interaction-ranking';
import type {Snapshot} from './types';
afterEach(()=>vi.useRealTimers());
const daily=[{mes:'2026-10',sin_fecha:0,rows:[{post_id:'A',fecha:'2026-10-15',interacciones:3},{post_id:'A',fecha:'2026-10-16',interacciones:7},{post_id:'B',fecha:'2026-10-16',interacciones:50}]}];
describe('Daily Post ID movement',()=>{
 it('changes days across month, leap day and year boundaries without timezone drift',()=>{
  expect(shiftDay('2026-01-01',-1)).toBe('2025-12-31');expect(shiftDay('2024-03-01',-1)).toBe('2024-02-29');
  expect(shiftDay('2026-10-31',1)).toBe('2026-11-01');expect(dayRange('2026-10-16')).toEqual({from:'2026-10-16',to:'2026-10-16'});
  expect(()=>dayRange('2026-02-31')).toThrow('Día inválido');expect(()=>dayRange('2026-13-01')).toThrow('Día inválido');
  expect(periodLabel('2026-10-01','2026-10-01')).toBe('1 de octubre de 2026');
  expect(comparisonRange('2026-10-01','2026-10-01')).toEqual({from:'2026-09-30',to:'2026-09-30'});
 });
 it('plots only matching Post IDs and dates, including genuine empty days',()=>{
  const result=interactionTimeline(daily,{from:'2026-10-14',to:'2026-10-16'},new Set(['A']));
  expect(result?.map(day=>[day.day,day.interactions])).toEqual([['2026-10-14',0],['2026-10-15',3],['2026-10-16',7]]);
  expect(interactionTimeline(daily,{from:'2026-10-15',to:'2026-10-16'},new Set(['B']))?.map(day=>day.interactions)).toEqual([0,50]);
 });
 it('does not fabricate a complete daily series if a month or historical dates are missing',()=>{
  expect(interactionTimeline([{...daily[0],sin_fecha:1}],dayRange('2026-10-16'),new Set(['A']))).toBeNull();
  expect(interactionTimeline(daily,{from:'2026-10-31',to:'2026-11-01'},new Set(['A']))).toBeNull();
 });
 it('daily rankings use the day count instead of the monthly denominator',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T17:00:00Z'));
  const snapshot:Snapshot={mode:'live',profile:{user_id:'qa',nombre:'QA',email:'',activo:true,role:'analista'},runs:[],catalog:[{post_id:'A',nombre_creativo:'A',producto:'Pulsar 180',campana:'',activo:true,plataforma:'Otra',fecha_inicio:''}],sales:[{pedido_id:'1',post_id:'A',linea:'Pulsar 180',fecha_venta:'2026-10-16T12:00:00-05:00',ciudad_original:'Bogotá',ciudad_normalizada:'Bogotá',departamento:'Cundinamarca',importe_cop:null,estado:'confirmado'}],interactions:[{post_id:'A',mes:'2026-10',interacciones:999}],dailyInteractions:daily};
  const row=interactionRanking(snapshot,dayRange('2026-10-16')).find(row=>row.post.post_id==='A')!;
  expect(row.interactions).toBe(7);expect(row.post.orders).toBe(1);expect(row.rate).toBeCloseTo(100/7);
  const previous=interactionRanking(snapshot,dayRange('2026-10-15')).find(row=>row.post.post_id==='A')!;expect(previous.interactions).toBe(3);expect(previous.post.orders).toBe(0);
 });
});
