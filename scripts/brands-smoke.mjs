import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,timeout:15000});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 const response=await page.goto(`${process.env.RADAR_TEST_URL ?? 'http://127.0.0.1:3101'}/marcas?demo=1`,{waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
 await page.getByRole('heading',{name:'Líneas / Marcas',exact:true}).waitFor();
 const select=page.getByRole('combobox',{name:'Filtrar por línea o marca'});
 const options=await select.locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,label:n.textContent})));
 assert.ok(options.length>1);
 await page.getByRole('button',{name:options[1].label,exact:true}).click();
 await page.getByRole('button',{name:options[1].label,exact:true,pressed:true}).waitFor();
 await page.getByRole('heading',{name:`Ciudades donde más vendes · ${options[1].label}`,exact:true}).waitFor();
 await page.getByRole('button',{name:'Ver valor',exact:true}).click();
 await page.getByRole('button',{name:'Ver cantidad',exact:true}).waitFor();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV'}).click();const download=await downloadPromise;
 await download.saveAs('tmp/qa/marcas.csv');const csv=await readFile('tmp/qa/marcas.csv','utf8');assert.ok(csv.includes(options[1].label));assert.ok(csv.includes('Ventas en ciudad'));
 await page.screenshot({path:'tmp/qa/marcas-desktop.png',fullPage:true,timeout:15000});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.getByRole('navigation',{name:'Navegación móvil'}).getByRole('link',{name:'Líneas / Marcas'}).isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page overflow');
 await page.screenshot({path:'tmp/qa/marcas-mobile.png',fullPage:true,timeout:15000});
 await select.selectOption('');await page.getByRole('button',{name:'Hoy',exact:true}).click();
 await page.getByRole('heading',{name:'Comparativo de líneas / marcas'}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',brands:options.length-1,csv:true,mobile:true,errors}));
} finally {await browser.close();}
