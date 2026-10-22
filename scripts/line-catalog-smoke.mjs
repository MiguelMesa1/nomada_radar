import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const snapshot={catalog:[],lines:[],sales:[],interactions:[],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
let failure=true,writes=0;
await page.route('**/api/snapshot?**',route=>route.fulfill({json:snapshot}));
await page.route('**/api/lines',route=>{
 writes++;if(failure)return route.fulfill({status:503,json:{error:'No pudimos guardar la línea. Intenta de nuevo.'}});
 const {nombre}=route.request().postDataJSON();snapshot.lines.push(nombre);return route.fulfill({status:201,json:{nombre}});
});
mkdirSync('tmp/qa',{recursive:true});
try{
 await page.goto(base+'/lineas',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Añadir línea',exact:true}).click();
 await page.getByLabel('Nombre de la nueva línea').fill(' Pulsar   135 ');
 await page.getByRole('dialog').getByRole('button',{name:'Guardar línea',exact:true}).click();
 await page.getByRole('dialog').getByRole('alert').waitFor();assert.deepEqual(snapshot.lines,[]);
 failure=false;await page.getByRole('dialog').getByRole('button',{name:'Guardar línea',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.locator('.line-buttons').getByRole('button',{name:/^Pulsar 135/}).waitFor();assert.deepEqual(snapshot.lines,['Pulsar 135']);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.line-buttons').getByRole('button',{name:/^Pulsar 135/}).waitFor();
 await page.getByRole('button',{name:'Añadir línea',exact:true}).click();await page.getByLabel('Nombre de la nueva línea').fill('pulsar 135');
 await page.getByRole('dialog').getByRole('button',{name:'Guardar línea',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Esa línea ya existe'}).waitFor();assert.equal(writes,2);await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Catálogo',exact:true}).first().click();await page.getByRole('button',{name:'Agregar Post ID',exact:true}).click();
 assert.equal(await page.locator('#line-options option').filter({hasText:'Pulsar 135'}).count(),1);await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'Ubicaciones',exact:true}).first().click();await page.getByLabel('Filtrar ubicaciones por línea').waitFor();
 assert.equal(await page.getByLabel('Filtrar ubicaciones por línea').locator('option').filter({hasText:'Pulsar 135'}).count(),1);
 await page.goto(base+'/lineas',{waitUntil:'domcontentloaded'});await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Añadir línea',exact:true}).click();await page.getByLabel('Nombre de la nueva línea').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'tmp/qa/add-line-mobile.png',fullPage:true});await page.keyboard.press('Escape');
 snapshot.profile.role='visualizador';await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Líneas',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Añadir línea',exact:true}).count(),0);assert.deepEqual(errors,[]);
 console.log('Line creation passed: save/retry, normalization, duplicate rejection, persistence after reload, zero-sales button, catalogue and location choices, mobile and read-only role.');
}catch(error){await page.screenshot({path:'tmp/qa/add-line-failure.png',fullPage:true});throw error}finally{await browser.close()}
