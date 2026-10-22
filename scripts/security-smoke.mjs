import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.RADAR_QA_URL??'http://127.0.0.1:3003';
const get=(path,options={})=>fetch(base+path,{...options,redirect:'manual',signal:AbortSignal.timeout(25000)});
const first=await get('/ingreso'),html=await first.text(),second=await get('/ingreso');
assert.equal(first.status,200);const csp=first.headers.get('content-security-policy');
assert(csp?.includes("frame-ancestors 'none'")&&csp.includes("object-src 'none'")&&csp.includes("'strict-dynamic'"));
assert(!csp.includes("script-src 'self' 'unsafe-inline'"));
assert.notEqual(csp,second.headers.get('content-security-policy'),'Nonces must change between responses');
assert.equal(first.headers.get('x-frame-options'),'DENY');assert.equal(first.headers.get('x-content-type-options'),'nosniff');
assert.match(first.headers.get('cache-control')??'',/no-store/,'Private pages must not be cached');
assert(!first.headers.has('x-powered-by'));
assert(html.includes('nonce='),'Framework and theme scripts must receive a nonce');
for(const [path,options,status] of [
 ['/api/snapshot?from=2026-10-01&to=2026-10-16',{},401],
 ['/api/export?from=2026-10-01&to=2026-10-16',{},401],
 ['/api/admin',{},401],
 ['/api/catalog',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'},403],
 ['/api/auth/refresh',{method:'POST',headers:{Origin:'https://evil.example'}},403],
 ['/api/sync',{method:'POST'},403],
 ['/api/auth/sign-in',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'x'.repeat(17000)},413],
 ['/api/auth/sign-in',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{'},400],
 ['/api/catalog',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'},401],
 ['/api/lines',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'},401],
 ['/api/sales/line',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'},401],
 ['/api/admin',{method:'PATCH',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'},401],
 ['/api/auth/activity',{method:'POST',headers:{Origin:base}},401],
 ['/.env.local',{},404],
 ['/.insforge/project.json',{},404],
]){const response=await get(path,options);assert.equal(response.status,status,`${path}: expected ${status}, got ${response.status}`);}
const text=fs.readFileSync('.env.local','utf8');const secrets=['INSFORGE_API_KEY','GOOGLE_APPS_SCRIPT_SYNC_TOKEN'].map(key=>text.split(/\r?\n/).find(line=>line.startsWith(key+'='))?.slice(key.length+1).replace(/^['"]|['"]$/g,'')).filter(value=>value?.length>20);
for(const entry of fs.readdirSync('.next/static',{recursive:true,withFileTypes:true}))if(entry.isFile()){
 const path=entry.parentPath+'/'+entry.name,content=fs.readFileSync(path);
 for(const secret of secrets)assert(!content.includes(Buffer.from(secret)),'Private credential found in browser bundle: '+entry.name);
}
console.log('HTTP security passed: anonymous access denied, CSRF denied including refresh, oversized bodies=413, malformed JSON=400, private files=404, nonce CSP and headers, no private credentials in browser bundles. No sign-in, recovery email or business data was created.');
