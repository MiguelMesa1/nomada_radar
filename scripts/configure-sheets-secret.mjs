import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const path='.env.radar-script.local';
const exists=fs.existsSync(path);
const token=exists?fs.readFileSync(path,'utf8').trim().split('=')[1]:randomBytes(32).toString('hex');
if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid integration secret format.');
if(!exists)fs.writeFileSync(path,`RADAR_TOKEN=${token}\n`,{mode:0o600});
try{
 execFileSync('npx.cmd',['-y','@insforge/cli','secrets','add','RADAR_SHEETS_TOKEN',token],{shell:true,stdio:'pipe'});
 console.log('Scoped integration token configured. Copy it from .env.radar-script.local to Script Properties; never use the InsForge admin key.');
}catch(e){
 // Do not print the CLI command or captured output: they may contain the token.
 console.error('Secret setup failed; local token preserved. Check whether RADAR_SHEETS_TOKEN already exists before retrying.');process.exitCode=1;
}
