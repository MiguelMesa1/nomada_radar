import { readFileSync } from 'node:fs';
import { createContext,runInContext } from 'node:vm';
import { describe,it,expect } from 'vitest';
const source=readFileSync('integrations/google-apps-script/NomadaRadar.gs','utf8');
function setup(){
 const props:Record<string,string>={RADAR_ENDPOINT:'https://backend.example.invalid/sheets-push',RADAR_ARCHIVO_INICIAL:'fixture_workbook_2026_abcdefghijkl',RADAR_ARCHIVOS_ANUALES:JSON.stringify(['fixture_workbook_2026_abcdefghijkl','fixture_workbook_2027_abcdefghijkl'])};const requested:number[]=[];
 const context=createContext({Date,console,PropertiesService:{getScriptProperties:()=>({getProperty:(k:string)=>props[k]??null,setProperty:(k:string,v:string)=>{props[k]=v;}})},Utilities:{formatDate:()=> '2026-10-15'}});
 runInContext(source,context);
 const sheet={getName:()=> 'Ventas',getLastRow:()=>3,getLastColumn:()=>9,getSheetId:()=>0,getRange:(row:number,col:number,height:number)=>{
  const headers=['Nombre','Fecha','Telefono','POST ID','Ciudad','Departamento','Total del pedido','Linea','Link'];
  const rows=[['Cliente privado',new Date('2026-10-15T12:00:00Z'),'555','ABC','Bogota','Cundinamarca','','Nomada','privado'],Array(9).fill('')];
  if(row>1)requested.push(col);
  return{getDisplayValues:()=>[headers],getValues:()=>rows.slice(0,height).map(r=>[r[col-1]])};
 }};
 return{context,props,requested,sheet};
}
describe('Google Apps Script adapter',()=>{
 it('projects IDS model columns, deduplicates within one model and preserves large ID text',()=>{
  const {context}=setup();
  const tab={getName:()=> 'IDS',getLastRow:()=>4,getLastColumn:()=>2,getRange:()=>({getDisplayValues:()=>[['XTZ 125','NS 200'],['52627676844020','52631542680220'],['52627676844020',''],['','']]})};
  context.SpreadsheetApp={openById:()=>({getSheets:()=>[tab]})};
  expect(context.leerCatalogoRadar_()).toEqual([{post_id:'52627676844020',producto:'XTZ 125'},{post_id:'52631542680220',producto:'NS 200'}]);
 });
 it('rejects IDs shared between models and does not clear the catalog if IDS is missing',()=>{
  const {context}=setup();
  const tab={getName:()=> 'IDS',getLastRow:()=>2,getLastColumn:()=>2,getRange:()=>({getDisplayValues:()=>[['XTZ 125','NS 200'],['SAME','SAME']]})};
  context.SpreadsheetApp={openById:()=>({getSheets:()=>[tab]})};
  expect(()=>context.leerCatalogoRadar_()).toThrow('dos modelos distintos');
  context.SpreadsheetApp={openById:()=>({getSheets:()=>[]})};
  expect(()=>context.leerCatalogoRadar_()).toThrow('Falta la pestaña IDS');
 });
 it('allows explicit removal of every ID while requiring a model header',()=>{
  const {context}=setup();
  const tab={getName:()=> 'IDS',getLastRow:()=>1,getLastColumn:()=>1,getRange:()=>({getDisplayValues:()=>[['XTZ 125']]})};
  context.SpreadsheetApp={openById:()=>({getSheets:()=>[tab]})};
  expect(context.leerCatalogoRadar_()).toEqual([]);
 });
 it('reads only Ventas and ignores monthly archives, summaries and copies',()=>{
  const {context}=setup();
  for(const name of ['Ventas','VENTAS',' ventas '])expect(context.esVentasRadar_(name)).toBe(true);
  for(const name of ['Enero','Septiembre','Octubre','Resumen','Clientes','Copia de Ventas','Ventas 2026'])expect(context.esVentasRadar_(name)).toBe(false);
 });
 it('includes both annual files even when previous installation stored only 2026',()=>{
  const {context,props}=setup();
  const expected=['fixture_workbook_2026_abcdefghijkl','fixture_workbook_2027_abcdefghijkl'];
  expect(context.archivosRadar_()).toEqual(expected);
  props.RADAR_ARCHIVOS=JSON.stringify([expected[0],'future_file_2028_abcdefghijkl']);
  expect(context.archivosRadar_()).toEqual([...expected,'future_file_2028_abcdefghijkl']);
 });
 it('reads only permitted columns and preserves dates and row positions',()=>{
  const {context,sheet,requested}=setup();
  const result=context.prepararPestanaRadar_({getId:()=> 'source-id'},sheet);
  expect(requested).toEqual([2,4,5,6,7,8]);
  expect(result.rows[1]).toEqual(['2026-10-15','ABC','Bogota','Cundinamarca','','Nomada',null]);
  expect(result.rows[2]).toEqual(['','','','','','',null]);
  expect(JSON.stringify(result)).not.toMatch(/Cliente privado|555|privado/);
 });
 it('rejects empty Ventas or missing headers and ignores unrelated tabs',()=>{
  const {context,sheet}=setup();
  expect(context.prepararPestanaRadar_({}, {...sheet,getName:()=> 'Enero'})).toBe(null);
  expect(()=>context.prepararPestanaRadar_({getName:()=> '2027'}, {...sheet,getLastRow:()=>0})).toThrow('necesita encabezados');
  expect(()=>context.prepararPestanaRadar_({getName:()=> '2027'}, {...sheet,getRange:()=>({getDisplayValues:()=>[['Nombre']]})})).toThrow('Faltan encabezados');
 });
 it('stops without posting a partial snapshot if either annual file lacks Ventas',()=>{
  const {context,props,sheet}=setup();let posted=false;
  props.RADAR_TOKEN='test-token';
  context.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})};
  context.SpreadsheetApp={openById:(id:string)=>({getId:()=>id,getName:()=>id,getSheets:()=>id===context.RADAR_ARCHIVO_INICIAL?[sheet]:[{...sheet,getName:()=> 'Enero'}]})};
  context.UrlFetchApp={fetch:()=>{posted=true;}};
  expect(()=>context.sincronizarRadar()).toThrow('una sola pestaña llamada Ventas');
  expect(posted).toBe(false);expect(props.RADAR_ULTIMO_RESULTADO).toContain('ERROR');
 });
 it('replaces hourly duplicates with one four-hour trigger and preserves unrelated jobs on repeated installs',()=>{
  const {context}=setup();
  const unrelated={getHandlerFunction:()=> 'otraTarea',hours:1};
  let triggers=[{getHandlerFunction:()=> 'sincronizarRadar',hours:1},{getHandlerFunction:()=> 'sincronizarRadar',hours:1},unrelated];
  context.ScriptApp={getProjectTriggers:()=>[...triggers],deleteTrigger:(t:unknown)=>{triggers=triggers.filter(v=>v!==t)},newTrigger:(handler:string)=>({timeBased:()=>({everyHours:(hours:number)=>({create:()=>{triggers.push({getHandlerFunction:()=>handler,hours})}})})})};
  context.SpreadsheetApp={getUi:()=>({alert:()=>{}})};context.sincronizarRadar=()=>{};
  for(let i=0;i<3;i++){
   context.instalarRadar();
   expect(triggers.filter(t=>t.getHandlerFunction()==='sincronizarRadar').map(t=>t.hours)).toEqual([4]);
   expect(triggers).toContain(unrelated);
  }
 });
 it('preserves the existing schedule when validation or creation fails',()=>{
  const {context}=setup();let created=0,removed=0;
  context.ScriptApp={getProjectTriggers:()=>[{getHandlerFunction:()=> 'sincronizarRadar'}],deleteTrigger:()=>{removed++},newTrigger:()=>{created++;throw Error('Cuota de Google')}};
  context.SpreadsheetApp={getUi:()=>({alert:()=>{}})};
  context.sincronizarRadar=()=>{throw Error('Google sin acceso')};
  expect(()=>context.instalarRadar()).toThrow('Google sin acceso');expect(created).toBe(0);expect(removed).toBe(0);
  context.sincronizarRadar=()=>{};
  expect(()=>context.instalarRadar()).toThrow('Cuota de Google');expect(created).toBe(1);expect(removed).toBe(0);
 });
});
