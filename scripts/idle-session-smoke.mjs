import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const start=Date.parse('2026-10-19T12:00:00Z'),hour=3600000;
const browser=await chromium.launch({headless:true});
let logouts=0,heartbeats=0;
const errors=[];
const snapshot={sessionExpiresAt:start+hour,catalog:[],sales:[],interactions:[],runs:[],profile:{user_id:'qa',nombre:'QA',email:'',role:'principal',activo:true},mode:'live'};
async function open(count=1){
 const context=await browser.newContext();
 await context.route('**/api/snapshot?**',route=>route.fulfill({json:snapshot}));
 await context.route('**/api/auth/activity',route=>{heartbeats++;return route.fulfill({json:{ok:true}})});
 await context.route('**/api/auth/sign-out',route=>{logouts++;return route.fulfill({json:{ok:true}})});
 const first=await context.newPage();await first.clock.install({time:new Date(start)});
 const pages=[first];if(count===2)pages.push(await context.newPage());
 for(const page of pages){page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/post-id?from=2026-10-01&to=2026-10-19');await page.getByRole('heading',{name:'Post ID',exact:true}).waitFor()}
 await first.clock.pauseAt(new Date(start+60000));
 return {context,pages};
}
try{
 const initial=await open(),page=initial.pages[0];console.log('Checking one-hour idle expiry');
 await page.clock.fastForward(hour-61000);assert.equal(logouts,0);assert.equal(heartbeats,0,'Background timers must not extend the session');
 await page.clock.fastForward(1000);await page.waitForURL('**/ingreso?motivo=inactividad');
 await page.getByRole('status').getByText(/Tu sesión se cerró/).waitFor();assert.equal(logouts,1);
 console.log('Idle expiry passed');await initial.context.close();
 const next=await open(),active=next.pages[0];console.log('Checking activity reset');
 await active.clock.fastForward(30*60000);
 await active.getByLabel('Buscar Post ID',{exact:true}).press('a');
 await active.clock.fastForward(59*60000);assert.equal(logouts,1,'User activity must reset the hour');assert.ok(heartbeats>0);
 await active.clock.fastForward(60000);await active.waitForURL('**/ingreso?motivo=inactividad');assert.equal(logouts,2);
 await next.context.close();
 const multi=await open(2),[first,second]=multi.pages;console.log('Checking cross-tab activity');
 await first.clock.fastForward(30*60000);
 await first.getByLabel('Buscar Post ID',{exact:true}).press('b');
 await second.clock.fastForward(31*60000);assert.equal(logouts,2,'Activity in another tab must keep the session open');
 await first.clock.fastForward(30*60000);await first.waitForURL('**/ingreso?motivo=inactividad');await second.waitForURL('**/ingreso?motivo=inactividad');
 assert.deepEqual(errors,[]);console.log('Idle session: exact one-hour expiry, no background renewal, activity reset, cross-tab activity and logout passed.');
}finally{await browser.close()}
