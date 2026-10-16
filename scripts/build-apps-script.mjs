import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const target='integrations/google-apps-script/NomadaRadar.gs';
const marker='/* SHARED_INTERACTION_PARSER */';
const source=fs.readFileSync('src/lib/interaction-import.ts','utf8')+'\n'+fs.readFileSync('src/lib/dated-interactions.ts','utf8');
const parser=stripTypeScriptTypes(source).replace(/^export /gm,'');
const script=fs.readFileSync(target,'utf8').split(marker)[0].trimEnd();
fs.writeFileSync(target,(script+'\n\n'+marker+'\n'+parser).replace(/[\t ]+$/gm,'').trimEnd()+'\n');
console.log('Apps Script monthly parser updated from tested source.');
