import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const snapshot={mode:'live',profile:{user_id:'qa',nombre:'QA',role:'analista',activo:true,email:''},catalog:[{post_id:'A',nombre_creativo:'A',producto:'NS 200',campana:'',plataforma:'Otra',activo:true,fecha_inicio:'2026-10-01'}],sales:[],runs:[],interactions:[]};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:950}});page.setDefaultTimeout(20000);
const counts=new Map(),errors=[];let fail=false,limit29=false,releaseOld;const oldGate=new Promise(resolve=>{releaseOld=resolve});
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/snapshot?**',route=>route.fulfill({json:snapshot}));
await page.route('**/api/meta?**',async route=>{
 const day=new URL(route.request().url()).searchParams.get('from');const attempt=(counts.get(day)??0)+1;counts.set(day,attempt);
 if(day==='2026-10-29'){if(limit29)return route.fulfill({status:429,headers:{'Retry-After':'300'},json:{error:'Meta limitó temporalmente las consultas de esta cuenta.'}});return route.fulfill({json:{configured:true,catalogAvailable:false,warning:'Cifras del día disponibles; Meta limitó los enlaces de anuncios.',ads:[{id:'A',name:'A',frequency:2.9}]}});}
 if(fail)return route.fulfill({status:503,json:{error:'Meta temporalmente ocupado'}});
 if(day==='2026-10-22'&&attempt===1)return route.fulfill({status:502,json:{error:'Meta temporalmente ocupado'}});
 if(day==='2026-10-21')await oldGate;
 return route.fulfill({json:{configured:true,ads:[{id:'A',name:'A',frequency:day==='2026-10-22'?2.2:day==='2026-10-21'?9.9:1.5}]}}).catch(()=>{});
});
const row=()=>page.getByRole('row',{name:'Ver detalle de A',exact:true});
try{
 await page.goto(base+'/post-id?from=2026-10-22&to=2026-10-22&periodo=dia',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByText('Meta está tardando. Reintentando automáticamente…',{exact:true}).waitFor();
 assert((await row().innerText()).includes('Consultando…'),'Loading must not be reported as a missing frequency');
 await row().getByText('2,2×',{exact:true}).waitFor();assert.equal(counts.get('2026-10-22'),2,'Recovers without a page reload');
 await page.getByLabel('Día del informe',{exact:true}).fill('2026-10-29');
 await row().getByText('2,9×',{exact:true}).waitFor();await page.getByText('Cifras del día disponibles; Meta limitó los enlaces de anuncios.',{exact:true}).waitFor();
 assert.equal(counts.get('2026-10-29'),1);limit29=true;await page.getByRole('button',{name:'Volver a consultar Meta',exact:true}).click();
 await page.getByText('Meta limitó temporalmente las consultas de esta cuenta.',{exact:true}).waitFor();assert.equal(counts.get('2026-10-29'),2,'Account rate limits must not trigger repeated retries');
 await page.getByLabel('Día del informe',{exact:true}).fill('2026-10-21');
 await page.waitForFunction(()=>document.querySelector('.meta-report-status [role="status"]')?.textContent==='Consultando Meta…');
 await page.getByLabel('Día del informe',{exact:true}).fill('2026-10-20');
 await row().getByText('1,5×',{exact:true}).waitFor();
 releaseOld();await page.getByLabel('Día del informe',{exact:true}).fill('2026-10-22');
 await row().getByText('2,2×',{exact:true}).waitFor();assert.equal(counts.get('2026-10-22'),2,'Returning to a loaded day must reuse that day, not another period');
 fail=true;await page.getByLabel('Día del informe',{exact:true}).fill('2026-10-19');
 await page.getByRole('button',{name:'Volver a consultar Meta',exact:true}).waitFor();
 assert.equal(counts.get('2026-10-19'),3,'Retries are bounded');assert((await row().innerText()).includes('No disponible'));assert(!(await row().innerText()).includes('9,9×'));
 fail=false;await page.getByRole('button',{name:'Volver a consultar Meta',exact:true}).click();
 await row().getByText('1,5×',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('Meta daily recovery passed: loading labels, automatic retry, bounded failures, stale response cancellation, per-day cache and manual recovery without reload.');
}finally{releaseOld();await browser.close()}
