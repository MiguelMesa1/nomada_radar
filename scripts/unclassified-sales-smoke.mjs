import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3132';
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'}).format(new Date());
const post={post_id:'A',nombre_creativo:'Publicación A',producto:'',campana:'',plataforma:'Otra',fecha_inicio:day,activo:true};
const sale=(index,noId)=>({pedido_id:`__fila__:abcdefghijklmnopqrstuv:0:${index+101}`,post_id:noId?'':'A',linea:'',fecha_venta:day+'T12:00:00-05:00',ciudad_original:'Bogotá',ciudad_normalizada:'Bogotá',departamento:'Cundinamarca',importe_cop:100000,estado:'confirmado'});
const snapshot={mode:'live',profile:{user_id:'qa',nombre:'QA',email:'',role:'analista',activo:true},catalog:[post],sales:[],runs:[],interactions:[]};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/snapshot?**',route=>route.fulfill({json:snapshot}));
try{
 for(const mixed of [true,false]){
  snapshot.sales=Array.from({length:6},(_,i)=>sale(i,mixed&&i>0));
  for(const route of ['conversion','lineas']){
   await page.goto(`${base}/${route}?from=${day}&to=${day}`,{waitUntil:'networkidle'});
   if(route==='conversion')await page.getByRole('button',{name:'Sin línea',exact:true}).click();
   else await page.getByLabel('Filtrar por línea',{exact:true}).selectOption('missing');
   const detail=page.getByRole('region',{name:'Ventas individuales de Sin línea',exact:true});
   await detail.getByRole('heading',{name:'6 ventas · Sin línea',exact:true}).waitFor();
   assert.equal(await detail.locator('tbody tr').count(),6);
   assert.equal(await detail.getByRole('link').count(),6);
   assert.match(await detail.innerText(),/Mostrando 1–6 de 6 ventas/);
   assert.equal(await detail.locator('td').filter({hasText:/^Sin ID$/}).count(),mixed?5:0);
   assert.equal(new Set(await detail.getByRole('link').evaluateAll(links=>links.map(link=>link.href))).size,6);
   await page.setViewportSize({width:390,height:844});
   assert.ok(await detail.getByRole('heading',{name:'6 ventas · Sin línea',exact:true}).isVisible());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.setViewportSize({width:1440,height:1000});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('Sin línea: six total sales show six individual rows and six source links in both reports, with shared IDs and Sin ID sales; desktop/mobile passed.');
}finally{await browser.close();}
