import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3131';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 for(const [route,title] of [['inicio','Inicio'],['post-id','Post ID'],['lineas','Líneas'],['interacciones','Interacciones'],['conversion','Conversión'],['catalogo','Catálogo']]){
  await page.goto(`${base}/${route}?demo=1`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:title,exact:true,level:1}).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/\bmarcas?\b/i,route+' must not present brand features');
 }
 await page.locator('table tbody tr').first().getByRole('button').first().click();
 await page.getByRole('dialog').waitFor();
 assert.equal(await page.getByRole('dialog').locator('[name="marca"]').count(),0);
 await page.keyboard.press('Escape');
 await page.goto(`${base}/conversion?demo=1`,{waitUntil:'networkidle'});
 await page.locator('.conversion-report > section').first().getByRole('button').first().click();
 await page.getByRole('button',{name:/Cambiar línea de/}).first().click();
 await page.getByRole('dialog').getByLabel('Línea del Post ID').waitFor();
 assert.equal(await page.getByRole('dialog').locator('[name="marca"]').count(),0);
 await page.keyboard.press('Escape');
 await page.goto(`${base}/post-id?demo=1&marca=Yamaha`,{waitUntil:'networkidle'});
 await page.locator('.posts-table tbody tr').first().click();
 await page.getByRole('dialog').waitFor();
 assert.doesNotMatch(await page.getByRole('dialog').innerText(),/\bmarcas?\b/i);
 await page.keyboard.press('Escape');
 await page.goto(`${base}/interacciones?demo=1`,{waitUntil:'networkidle'});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();
 const download=await pending,content=await readFile(await download.path(),'utf8');
 assert.ok(content.split('\r\n')[0].includes('"Línea"'));
 assert.doesNotMatch(content.split('\r\n')[0],/marca/i);
 await page.goto(`${base}/marcas?demo=1&from=2026-10-01&to=2026-10-19`,{waitUntil:'networkidle'});
 assert.equal(new URL(page.url()).pathname,'/lineas');
 assert.equal(new URL(page.url()).searchParams.get('from'),'2026-10-01');
 await page.getByRole('heading',{name:'Líneas',exact:true,level:1}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Brand removal passed: six reports, catalogue and classification forms, post detail, CSV headers, and legacy route compatibility.');
}finally{await browser.close();}
