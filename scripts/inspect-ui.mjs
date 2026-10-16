import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
try{const r=await page.goto('http://127.0.0.1:3000/inicio?demo=1',{waitUntil:'domcontentloaded',timeout:60000});console.log('STATUS',r.status());console.log('TITLE',await page.title());console.log('BODY',(await page.locator('body').innerText()).slice(0,2500));console.log('HEADINGS',await page.locator('h1').allTextContents());await page.screenshot({path:'tmp/qa/debug.png',fullPage:false,timeout:60000});}finally{await browser.close()}
