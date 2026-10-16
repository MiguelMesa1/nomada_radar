import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
// Transpile the same tested pure parsers used by Next.js, without a second
// implementation or an additional bundler dependency. Runtime deps stay ESM.
const modules=['classification','analytics','ingestion','sheets-push'];
// Pin to the version tested locally; Deno's unversioned npm resolution can
// otherwise reuse a different major pulled transitively by the SDK.
const zodVersion=JSON.parse(fs.readFileSync('node_modules/zod/package.json','utf8')).version;
let shared=`import { z } from 'npm:zod@${zodVersion}';\n`;
for(const name of modules){
 const source=fs.readFileSync(`src/lib/${name}.ts`,'utf8').replace(/^import .*?;\r?\n/gm,'');
 const code=stripTypeScriptTypes(source).replace(/^export /gm,'');
 shared+=code+'\n';
}
const entry=fs.readFileSync('functions/sheets-push.mjs','utf8');
fs.writeFileSync('functions/sheets-push.bundle.mjs',entry.replace('/* SHARED_PARSER */',shared).replace(/[\t ]+$/gm,'').trimEnd()+'\n');
console.log('Generated functions/sheets-push.bundle.mjs');
