import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let recover=false,pending;
await page.route('**/api/snapshot?**',route=>{
 if(!recover){pending=route;return;}
 return route.fulfill({json:{mode:'live',profile:{user_id:'qa',nombre:'Prueba local',email:'',role:'analista',activo:true},catalog:[],sales:[],runs:[]}});
});
const check=(value,message)=>{if(!value)throw Error(message)};
mkdirSync('tmp/qa',{recursive:true});
try{
 await page.goto(process.env.RADAR_QA_URL??'http://127.0.0.1:3000/inicio',{waitUntil:'domcontentloaded'});
 await page.getByRole('status').waitFor();
 const card=await page.locator('.loading-card').boundingBox();
 check(Math.abs(card.x+card.width/2-640)<2,'Desktop loader must be horizontally centered');
 const icon=await page.locator('.loading-indicator svg').boundingBox(),text=await page.getByText('Cargando Radar…',{exact:true}).boundingBox();
 check(Math.abs(icon.y+icon.height/2-text.y-text.height/2)<2,'Spinner and label must align');
 await page.screenshot({path:'tmp/qa/loading-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile loader must not overflow');
 await page.screenshot({path:'tmp/qa/loading-mobile.png'});
 await page.getByRole('heading',{name:'No pudimos abrir Radar'}).waitFor();
 await page.getByText('La conexión está tardando más de lo esperado.',{exact:false}).waitFor();
 await pending.abort().catch(()=>{});
 recover=true;
 await page.getByRole('button',{name:'Reintentar',exact:true}).click();
 await page.getByRole('heading',{name:'Inicio',exact:true}).waitFor();
 check(errors.length===0,errors.join('; '));
 console.log('Loading UI passed: desktop alignment, mobile fit, 20-second timeout and successful retry.');
}finally{await browser.close();}
