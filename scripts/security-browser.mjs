import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},bypassCSP:false});
try{
 const payload='<img src=x onerror="window.__radarXss=2">';
 await page.route('**/api/snapshot?**',route=>route.fulfill({json:{mode:'live',profile:{user_id:'qa',nombre:'Prueba',email:'',role:'visualizador',activo:true},catalog:[{post_id:'A',nombre_creativo:payload,producto:'XTZ 125',marca:'Yamaha',campana:'',plataforma:'Otra',fecha_inicio:'2026-10-01',activo:true}],sales:[],runs:[],interactions:[]}}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/post-id',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Post ID',exact:true}).waitFor();
 assert.equal(await page.locator('img[onerror]').count(),0,'Catalog text must not become executable HTML');
 assert.equal(await page.evaluate(()=>window.__radarXss),undefined);
 assert.equal(await page.getByRole('link',{name:'Administración',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Exportar CSV',exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 // Insert an untrusted parser script into a real response, keeping its real
 // CSP. A script inserted by DevTools from a trusted runtime is not a valid
 // test for strict-dynamic, which deliberately propagates script trust.
 await page.route('**/ingreso',async route=>{const response=await route.fetch();const html=await response.text();await route.fulfill({response,body:html.replace('<head>','<head><script>window.__radarParserXss=1</script>')})});
 await page.goto(base+'/ingreso',{waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>window.__radarParserXss),undefined,'CSP must block an injected parser script without the request nonce');
 await page.getByRole('heading',{name:'Ingresa a Radar',exact:true}).waitFor();
 console.log('Browser security passed: nonce CSP blocks injected parser scripts, catalog text is escaped, readonly UI remains readonly, hydration works.');
}finally{await browser.close()}
