import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const date='2026-10-14T17:00:00Z',file='abcdefghijklmnopqrstuv';
const sale=row=>({pedido_id:`__fila__:${file}:0:${row}`,post_id:'',fecha_venta:date,linea:'Sin línea',importe_cop:null,ciudad_original:'',ciudad_normalizada:'',departamento:'',estado:'confirmado'});
const snapshot={catalog:[],sales:[sale(1046),sale(1047)],interactions:[],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],writes=[];let reject=true;
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/snapshot?**',route=>route.fulfill({json:snapshot}));
await page.route('**/api/sales/line',route=>{
 const body=route.request().postDataJSON();writes.push(body);
 if(reject)return route.fulfill({status:503,json:{error:'No pudimos guardar la línea. Intenta de nuevo.'}});
 snapshot.sales=snapshot.sales.map(sale=>sale.pedido_id===body.pedido_id&&sale.fecha_venta===body.fecha_venta?{...sale,linea_importada:sale.linea_importada??sale.linea,linea:body.linea}:sale);
 return route.fulfill({json:{ok:true,...body}});
});
const assign=()=>page.getByRole('button',{name:'Asignar línea a venta '+sale(1046).pedido_id,exact:true});
const save=async value=>{await page.getByRole('dialog').getByLabel('Línea de la venta').fill(value);await page.getByRole('dialog').getByRole('button',{name:'Guardar línea',exact:true}).click()};
async function open(){await page.goto(base+'/conversion?from=2026-10-01&to=2026-10-31',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Conversión',exact:true}).waitFor()}
mkdirSync('tmp/qa',{recursive:true});
try{
 await open();await page.getByRole('button',{name:'Sin línea',exact:true}).click();
 assert.equal(await page.locator('.sales-detail tbody tr').count(),2);
 await assign().click();await page.getByRole('dialog').getByText(/fila 1046/).waitFor();
 await save('Otra marca');await page.getByRole('dialog').getByRole('alert').waitFor();assert.equal(snapshot.sales[0].linea,'Sin línea');
 reject=false;await save('Otra marca');await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Otra marca',exact:true}).click();
 await page.locator('.sales-detail').getByText('Importada: Sin línea',{exact:true}).waitFor();
 assert.equal(snapshot.sales[1].linea,'Sin línea');assert.equal(snapshot.sales[0].post_id,'');
 assert.equal(writes.at(-1).pedido_id,sale(1046).pedido_id);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Otra marca',exact:true}).click();
 await assign().waitFor();assert.equal(await page.locator('.sales-detail tbody tr').count(),1);
 assert.equal(await page.locator('.sales-detail').getByRole('link').count(),0);await page.getByText('Hoja 0 · fila 1046',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await assign().click();await save('XTZ125');await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'XTZ 125',exact:true}).click();await page.locator('.sales-detail').getByText('Importada: Sin línea',{exact:true}).waitFor();
 assert.equal(snapshot.sales[0].linea,'XTZ 125');assert.equal(snapshot.sales[0].linea_importada,'Sin línea');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'tmp/qa/sale-line-mobile.png',fullPage:true});
 snapshot.profile.role='visualizador';await open();await page.getByRole('button',{name:'XTZ 125',exact:true}).click();assert.equal(await assign().count(),0);
 assert.deepEqual(errors,[]);console.log('Sale line assignment passed: per-row save, retry, Otra marca, reload persistence, original line, source reference without a file link, mobile and viewer permissions.');
}finally{await browser.close()}
