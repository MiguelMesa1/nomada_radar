export function isPrivatePath(pathname:string){
 let path=pathname;
 try{for(let i=0;i<2;i++){const decoded=decodeURIComponent(path);if(decoded===path)break;path=decoded}}catch{return true}
 const parts=path.replace(/\\/g,'/').split('/').filter(Boolean);
 if(parts.some((part,index)=>part.startsWith('.')&&!(index===0&&part==='.well-known')))return true;
 if(['src','migrations','functions','integrations','scripts','node_modules','tmp','backups','exports','credentials','secrets'].includes(parts[0]?.toLowerCase()))return true;
 return ['package.json','package-lock.json','insforge.toml','agents.md','seguridad.md','tsconfig.json','next.config.ts','postcss.config.mjs'].includes(parts[0]?.toLowerCase());
}
