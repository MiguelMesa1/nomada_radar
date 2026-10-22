/** Keep stalled requests and hosting error pages out of user-facing forms. */
export async function requestJSON<T=Record<string,unknown>>(url:string,init:RequestInit={},timeout=20000):Promise<T>{
 const deadline=AbortSignal.timeout(timeout);
 const signal=init.signal?AbortSignal.any([init.signal,deadline]):deadline;
 try{
  const response=await fetch(url,{...init,signal,cache:'no-store'});
  let data;
  try{data=await response.json()}catch{
   throw new Error('El servidor no respondió correctamente. Intenta de nuevo en unos momentos.');
  }
  if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:'No pudimos completar la operación. Intenta de nuevo.');
  return data as T;
 }catch(error){
  if(deadline.aborted)throw new Error('La conexión tardó demasiado. Recarga el informe para comprobar el resultado antes de repetir la acción.');
  throw error;
 }
}
