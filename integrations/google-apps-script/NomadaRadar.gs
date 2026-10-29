/** Nómada Radar. Pegar en Extensiones > Apps Script del archivo 2026.
 * Configurar RADAR_TOKEN en Configuración del proyecto > Propiedades del script.
 * Después ejecutar instalarRadar() una sola vez y autorizar con tu cuenta.
 * La actualización desde Radar usa la implementación web protegida por token.
 */
var RADAR_ENDPOINT=PropertiesService.getScriptProperties().getProperty('RADAR_ENDPOINT')||'';
var RADAR_ARCHIVO_INICIAL=PropertiesService.getScriptProperties().getProperty('RADAR_ARCHIVO_INICIAL')||'';
var RADAR_ARCHIVOS_ANUALES=JSON.parse(PropertiesService.getScriptProperties().getProperty('RADAR_ARCHIVOS_ANUALES')||'[]');

function onOpen(){
 SpreadsheetApp.getUi().createMenu('Nómada Radar')
  .addItem('Sincronizar ahora','sincronizarRadar')
  .addItem('Agregar archivo de otro año','agregarArchivoRadar')
  .addItem('Ver archivos y último resultado','estadoRadar')
  .addItem('Instalar actualización cada 4 horas','instalarRadar').addToUi();
}
function archivosRadar_(){
 if(!RADAR_ARCHIVO_INICIAL||!/^https:\/\//.test(RADAR_ENDPOINT)||!Array.isArray(RADAR_ARCHIVOS_ANUALES))throw new Error('Configura RADAR_ENDPOINT, RADAR_ARCHIVO_INICIAL y RADAR_ARCHIVOS_ANUALES en las propiedades del script.');
 var extra=JSON.parse(PropertiesService.getScriptProperties().getProperty('RADAR_ARCHIVOS')||'[]');
 return [RADAR_ARCHIVO_INICIAL].concat(RADAR_ARCHIVOS_ANUALES,extra).filter(function(id,i,ids){return id&&ids.indexOf(id)===i;});
}
function agregarArchivoRadar(){
 var ui=SpreadsheetApp.getUi(),r=ui.prompt('Agregar archivo anual','Pega el enlace del nuevo Google Sheets (por ejemplo, el de 2027).',ui.ButtonSet.OK_CANCEL);
 if(r.getSelectedButton()!==ui.Button.OK)return;
 var text=r.getResponseText().trim(),m=text.match(/\/spreadsheets\/d\/([\w-]+)/),id=m?m[1]:text;
 if(!/^[\w-]{20,100}$/.test(id))throw new Error('El enlace no es válido.');
 var book=SpreadsheetApp.openById(id),ids=archivosRadar_();
 if(ids.indexOf(id)<0)ids.push(id);
 PropertiesService.getScriptProperties().setProperty('RADAR_ARCHIVOS',JSON.stringify(ids));
 ui.alert('Agregado: '+book.getName()+'. Se conserva la lectura de los archivos anteriores.');
}
function instalarRadar(){
 // Verify access, data and endpoint BEFORE installing a recurring trigger.
 sincronizarRadar();
 var triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='sincronizarRadar';});
 // Trigger metadata does not expose its interval. Replace old hourly triggers,
 // creating the new schedule first so a Google quota failure keeps the old one.
 ScriptApp.newTrigger('sincronizarRadar').timeBased().everyHours(4).create();
 triggers.forEach(function(t){ScriptApp.deleteTrigger(t);});
 console.log('Carga completada. Actualización automática cada 4 horas. Puedes usar Actualizar cuando lo necesites.');
}
function esVentasRadar_(name){return normalizarRadar_(name)==='ventas';}
function normalizarRadar_(value){return String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
function leerCatalogoRadar_(){
 // One shared catalog, in the original workbook, also applies to future years.
 var book=SpreadsheetApp.openById(RADAR_ARCHIVO_INICIAL);
 var tabs=book.getSheets().filter(function(s){return normalizarRadar_(s.getName())==='ids';});
 if(tabs.length!==1)throw new Error('Falta la pestaña IDS en el archivo de 2026. Se conserva el catálogo anterior.');
 var tab=tabs[0],height=tab.getLastRow(),width=tab.getLastColumn();
 if(!height||!width)throw new Error('IDS necesita los modelos o marcas en la fila 1.');
 if(height*width>50000)throw new Error('IDS supera 50.000 celdas.');
 var cells=tab.getRange(1,1,height,width).getDisplayValues(),catalog=[],seen={};
 for(var c=0;c<width;c++){
  var model=String(cells[0][c]||'').trim();
  for(var r=1;r<height;r++){
   var id=String(cells[r][c]||'').trim().toUpperCase();if(!id)continue;
   if(!model)throw new Error('Hay IDs bajo una columna sin marca o modelo en IDS.');
   if(id.length>100||model.length>120)throw new Error('Un ID o encabezado de IDS es demasiado largo.');
   if(Object.prototype.hasOwnProperty.call(seen,id)){
    if(seen[id]!==model)throw new Error('El ID '+id+' aparece en dos modelos distintos.');
    continue;
   }
   seen[id]=model;catalog.push({post_id:id,producto:model});
  }
 }
 if(catalog.length>10000)throw new Error('IDS supera 10.000 IDs.');
 return catalog;
}
function leerInteraccionesRadar_(){
 var groups=[];
 archivosRadar_().forEach(function(id){
  var book=SpreadsheetApp.openById(id),tabs=book.getSheets().filter(function(s){return normalizarRadar_(s.getName())==='conteo post id';});
  if(!tabs.length)return;
  if(tabs.length!==1)throw new Error('Hay dos pestañas Conteo POST ID en '+book.getName());
  var tab=tabs[0],height=tab.getLastRow(),width=tab.getLastColumn(),year=/20\d{2}/.exec(book.getName());
  if(!year)throw new Error('Incluye el año en el nombre del archivo: por ejemplo Pedidos Bot 2026.');
  if(height*width>50000)throw new Error('Conteo POST ID supera 50.000 celdas.');
  var cells=tab.getRange(1,1,height,width).getValues();
  groups=groups.concat(parseInteractionBlocks(cells,Number(year[0])));
 });
 return groups.length?groups:null;
}
function leerInteraccionesConFechaRadar_(){
 var groups=[];
 archivosRadar_().forEach(function(id){
  var book=SpreadsheetApp.openById(id),tabs=book.getSheets().filter(function(s){return normalizarRadar_(s.getName())==='todos los id';});
  if(!tabs.length)return;
  if(tabs.length!==1)throw new Error('Hay dos pestañas Todos los ID en '+book.getName());
  var tab=tabs[0],height=tab.getLastRow(),width=tab.getLastColumn(),year=/20\d{2}/.exec(book.getName());
  if(!year)throw new Error('Incluye el año en el nombre del archivo de interacciones.');
  if(height>50001)throw new Error('Todos los ID supera 50.000 filas.');
  var headers=tab.getRange(1,1,1,width).getDisplayValues()[0].map(normalizarRadar_);
  var idCol=headers.findIndex(function(h){return h==='# id'||h==='post id'||h==='post_id'||h==='id';}),monthCol=headers.indexOf('mes'),dateCol=headers.indexOf('fecha');
  if(idCol<0)throw new Error('Todos los ID necesita # ID.');
  if(dateCol<0)return;
  var n=height-1,columns=[idCol,monthCol,dateCol].map(function(c){return c>=0&&n?tab.getRange(2,c+1,n,1).getValues():null;}),cells=[['# ID','Mes','Fecha']];
  for(var r=0;r<n;r++)cells.push(columns.map(function(col){return col?col[r][0]:null;}));
  groups=groups.concat(parseDatedInteractions(cells,Number(year[0])));
 });
 return groups.length?groups:null;
}
function prepararPestanaRadar_(book,sheet){
 if(!esVentasRadar_(sheet.getName()))return null;
 if(sheet.getLastRow()===0)throw new Error('La pestaña Ventas de '+book.getName()+' necesita encabezados en la fila 1.');
 var width=sheet.getLastColumn(),headers=sheet.getRange(1,1,1,width).getDisplayValues()[0].map(normalizarRadar_);
 var aliases=[['fecha','fecha_venta','fecha venta'],['post id','post_id'],['ciudad'],['departamento'],['total del pedido','total pedido','valor_total','valor total'],['linea','marca'],['estado','estado del pedido'],['producto','productos','resumen del pedido','detalle del pedido']];
 var indexes=aliases.map(function(names){return headers.findIndex(function(h){return names.indexOf(h)>=0;});});
 if(indexes.slice(0,4).some(function(i){return i<0;}))throw new Error('Faltan encabezados en '+book.getName()+' / '+sheet.getName()+'. Usa la fila 1.');
 var rows=[['Fecha','POST ID','Ciudad','Departamento','Total del pedido','Linea','Estado','Resumen del pedido']],height=sheet.getLastRow()-1;
 if(height>50000)throw new Error('Demasiadas filas en '+sheet.getName()+'.');
 // Read allowed analytics columns and product descriptions only. Never client names, phones or addresses.
 var columns=indexes.map(function(col){return col<0||!height?null:sheet.getRange(2,col+1,height,1).getValues();});
 for(var r=0;r<height;r++){
  var row=columns.map(function(col){var v=col?col[r][0]:null;return v instanceof Date?Utilities.formatDate(v,'America/Bogota','yyyy-MM-dd'):v;});
  var line=normalizarRadar_(row[5]).replace(/\s+/g,' ');
  var needsSummary=!String(row[1]||'').trim()&&['','sin linea','otra marca','otra linea','otra','otros','otras'].indexOf(line)>=0;
  row[7]=needsSummary?String(row[7]||'').trim().slice(0,1500):'';
  // Preserve offsets. A blank physical row is NOT a sale.
  rows.push(row);
 }
 return {spreadsheetId:book.getId(),sheetId:sheet.getSheetId(),name:sheet.getName(),rows:rows};
}
function sincronizarRadar(){
 var lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw new Error('Ya hay una sincronización en curso.');
 var props=PropertiesService.getScriptProperties();
 try{
  var token=props.getProperty('RADAR_TOKEN');if(!token)throw new Error('Falta RADAR_TOKEN en Propiedades del script.');
  var sheets=[],start=Date.now();
  archivosRadar_().forEach(function(id){
   var book=SpreadsheetApp.openById(id);
   var targets=book.getSheets().filter(function(sheet){return esVentasRadar_(sheet.getName());});
   if(targets.length!==1)throw new Error('El archivo '+book.getName()+' debe tener una sola pestaña llamada Ventas. No se envió una carga parcial.');
   if(Date.now()-start>240000)throw new Error('Se excedió el tiempo de lectura; no se envió una carga parcial.');
   sheets.push(prepararPestanaRadar_(book,targets[0]));
  });
  if(!sheets.length)throw new Error('No se encontraron pestañas Ventas con encabezados.');
  var catalog=leerCatalogoRadar_();
  var interactions=leerInteraccionesRadar_();
  var data={version:1,sheets:sheets,catalog:catalog};if(interactions)data.interactions=interactions;var daily=leerInteraccionesConFechaRadar_();if(daily)data.daily_interactions=daily;
  var payload=JSON.stringify(data);
  if(Utilities.newBlob(payload).getBytes().length>8000000)throw new Error('La carga supera 8 MB. Requiere dividir el histórico.');
  var response=UrlFetchApp.fetch(RADAR_ENDPOINT,{method:'post',contentType:'application/json',headers:{'x-radar-token':token},payload:payload,muteHttpExceptions:true});
  var result;try{result=JSON.parse(response.getContentText());}catch(e){throw new Error('Respuesta inesperada del servidor. Código '+response.getResponseCode());}
  if(response.getResponseCode()!==200||!result.ok)throw new Error(result.error||'No se pudo completar la carga.');
  var message='OK · '+result.orders+' ventas · '+result.issues+' pendientes de calidad · '+result.catalog+' IDs de catálogo'+(result.interactions!=null?' · '+result.interactions+' IDs con interacciones de '+result.interactionMonths.join(', '):'')+' · '+new Date().toISOString();
  props.setProperty('RADAR_ULTIMO_RESULTADO',message);console.log(message);
  return result;
 }catch(e){props.setProperty('RADAR_ULTIMO_RESULTADO','ERROR · '+e.message+' · '+new Date().toISOString());throw e;}
 finally{lock.releaseLock();}
}
function estadoRadar(){
 SpreadsheetApp.getUi().alert('Archivos registrados:\n'+archivosRadar_().map(function(id){return 'https://docs.google.com/spreadsheets/d/'+id+'/edit';}).join('\n')+'\n\n'+(PropertiesService.getScriptProperties().getProperty('RADAR_ULTIMO_RESULTADO')||'Sin ejecutar todavía.'));
}

/** Optional web app endpoint for Radar's Update button. Deploy as owner,
 * allow requests without a Google sign-in, and keep RADAR_TOKEN private.
 * No spreadsheet contents are returned: only the import result.
 */
function doPost(e){
 var output;
 try{
  var body=JSON.parse(e.postData.contents),token=PropertiesService.getScriptProperties().getProperty('RADAR_TOKEN');
  if(!token||body.token!==token)throw new Error('No autorizado.');
  if(body.action!=='sync')throw new Error('Acción inválida.');
  output=sincronizarRadar();
 }catch(error){output={ok:false,error:error.message||'La sincronización falló.'};}
 return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

/* SHARED_INTERACTION_PARSER */

// Pure adapter shared with the Apps Script source and the connector import.
function parseInteractionBlocks(cells            ,year       )                      {
 if(!Number.isInteger(year)||year<2000||year>2199)throw Error('Falta el año del archivo de interacciones.');
 const clean=(value        )=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const months                      ={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
 const groups                      =[];const used=new Set        ();
 for(let c=0;c<(cells[0]?.length??0);c++){
  const title=clean(cells[0][c]);if(!title)continue;
  let month       ;
  if(title==='interacciones'&&/^\d{4}-(?:0[1-9]|1[0-2])$/.test(String(cells[0][c+1]??'')))month=String(cells[0][c+1]);
  else{const match=/^interacciones\s+(\w+)(?:\s+(20\d{2}))?$/.exec(title);if(!match||!months[match[1]]){if(/^interacciones/.test(title))throw Error('El bloque de interacciones necesita un nombre de mes válido.');continue;}month=`${match[2]??year}-${months[match[1]]}`;}
  if(used.has(month))throw Error('Hay dos bloques de interacciones para '+month);used.add(month);
  const idHeader=clean(cells[1]?.[c]),countHeader=clean(cells[1]?.[c+1]);
  if(!['post id','post_id'].includes(idHeader)||countHeader!=='interacciones')throw Error('Cada bloque necesita Post ID e Interacciones en la fila 2.');
  const entries=new Map               ();
  for(let r=2;r<cells.length;r++){
   const id=String(cells[r][c]??'').trim().toUpperCase(),raw=cells[r][c+1];
   if(!id&&(raw==null||raw===''))continue;
   if(!id)throw Error('Hay interacciones sin Post ID.');
   if(raw==null||raw==='')continue;
   const count=typeof raw==='number'?raw:/^\d+$/.test(String(raw).trim())?Number(raw):NaN;
   if(!Number.isSafeInteger(count)||count<0)throw Error('Interacciones inválidas para '+id);
   if(entries.has(id)&&entries.get(id)!==count)throw Error('Hay dos cantidades de interacciones para '+id+' en '+month);
   entries.set(id,count);
  }
  groups.push({mes:month,rows:[...entries].map(([post_id,interacciones])=>({post_id,interacciones}))});
 }
 if(!groups.length)throw Error('No se encontraron bloques mensuales de interacciones.');
 return groups;
}


function parseDatedInteractions(cells            ,year       )                        {
 if(!Number.isInteger(year)||year<2000||year>2199)throw Error('Año inválido para Todos los ID.');
 const norm=(v        )=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const headers=(cells[0]??[]).map(norm),idCol=headers.findIndex(h=>['# id','post id','post_id','id'].includes(h)),dateCol=headers.indexOf('fecha'),monthCol=headers.indexOf('mes');
 if(idCol<0)throw Error('Todos los ID necesita una columna # ID.');
 if(dateCol<0)return [];
 const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
 const groups=months.map((_,m)=>({mes:`${year}-${String(m+1).padStart(2,'0')}`,sin_fecha:0,counts:new Map                                                           ()}));
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'});
 for(let i=1;i<cells.length;i++){
  const row=cells[i],id=String(row[idCol]??'').trim().toUpperCase(),raw=row[dateCol];
  if(!id){if(String(raw??'').trim())throw Error('Hay una fecha sin Post ID en Todos los ID.');continue;}
  if(raw==null||String(raw).trim()===''){
   const text=norm(row[monthCol]),index=months.indexOf(text==='setiembre'?'septiembre':text),isoMonth=/^\d{4}-(0[1-9]|1[0-2])$/.test(text)?Number(text.slice(-2))-1:-1;
   const m=index>=0?index:isoMonth;if(m<0)throw Error('Una interacción sin fecha tampoco tiene un mes válido.');groups[m].sin_fecha++;continue;
  }
  let value=raw;
  if(Object.prototype.toString.call(raw)!=='[object Date]'){
   let text=String(raw).trim();const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
   if(match)text=`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
   if(/^\d{4}-\d{2}-\d{2}$/.test(text))text+='T12:00:00-05:00';
   const parts=/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(text);
   if(!parts)throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
   const y=Number(parts[1]),m=Number(parts[2]),d=Number(parts[3]),check=new Date(Date.UTC(y,m-1,d));
   if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
   value=new Date(text);
  }
  const instant=value        ;if(!Number.isFinite(instant.getTime()))throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
  const day=formatter.format(instant);if(!day.startsWith(String(year)+'-'))throw Error('Hay una interacción fuera del año del archivo en Todos los ID.');
  const group=groups[Number(day.slice(5,7))-1],key=id+'|'+day,entry=group.counts.get(key)??{post_id:id,fecha:day,interacciones:0};
  entry.interacciones++;group.counts.set(key,entry);
 }
 return groups.map(g=>({mes:g.mes,sin_fecha:g.sin_fecha,rows:[...g.counts.values()]}));
}
