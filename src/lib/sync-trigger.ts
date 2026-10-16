export function validAppsScriptUrl(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='script.google.com'&&/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash&&!u.username&&!u.password;}catch{return false;}
}
export async function triggerSheetsSync(url:string,token:string){
 if(!validAppsScriptUrl(url))throw Error('El enlace de sincronización de Google no es válido.');
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync',token}),redirect:'follow',signal:AbortSignal.timeout(110000),cache:'no-store'});
 if(!response.ok)throw Error('No pudimos actualizar las ventas desde Google. Intenta de nuevo o contacta al administrador.');
 let result;try{result=await response.json();}catch{throw Error('Google solicitó iniciar sesión. Contacta al administrador para restablecer la actualización.');}
 if(!result.ok)throw Error(typeof result.error==='string'?result.error:'La sincronización no terminó correctamente.');
 return result as {ok:true;orders:number;catalog?:number;interactions?:number};
}
