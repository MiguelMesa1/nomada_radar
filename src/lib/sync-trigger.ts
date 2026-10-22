import {AppError} from './errors';
export function validAppsScriptUrl(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='script.google.com'&&/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash&&!u.username&&!u.password;}catch{return false;}
}
export async function triggerSheetsSync(url:string,token:string){
 if(!validAppsScriptUrl(url))throw new AppError('El enlace de sincronización de Google no es válido.',502);
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync',token}),redirect:'follow',signal:AbortSignal.timeout(110000),cache:'no-store'});
 if(!response.ok)throw new AppError('No pudimos actualizar las ventas desde Google. Intenta de nuevo o contacta al administrador.',502);
 let result;try{result=await response.json();}catch{throw new AppError('Google solicitó iniciar sesión. Contacta al administrador para restablecer la actualización.',502);}
 if(!result||typeof result!=='object'||result.ok!==true){
  const message=typeof result?.error==='string'?result.error.toLowerCase():'';
  // Never echo arbitrary upstream errors: they may contain private sheet URLs or cell values.
  const safe=message.includes('fecha')?'Hay fechas inválidas en la hoja. Revisa los registros antes de actualizar.':message.includes('curso')?'Ya hay una actualización en curso. Espera antes de reintentar.':'La sincronización no terminó correctamente. Revisa el resultado en el menú de Nómada Radar de la hoja.';
  throw new AppError(safe,502);
 }
 if(!Number.isSafeInteger(result.orders)||result.orders<0||result.orders>1000000||['catalog','interactions'].some(key=>result[key]!==undefined&&(!Number.isSafeInteger(result[key])||result[key]<0||result[key]>1000000)))throw new AppError('Google devolvió una respuesta de actualización inválida.',502);
 return result as {ok:true;orders:number;catalog?:number;interactions?:number};
}
