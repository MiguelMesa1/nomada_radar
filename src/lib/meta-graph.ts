import 'server-only';
import {AppError} from './errors';

export async function metaPages<T>(account:string,edge:string,params:Record<string,string>):Promise<T[]>{
 const token=process.env.META_ACCESS_TOKEN;
 if(!token||!/^\d+$/.test(account))throw new AppError('Falta configurar la conexión con Meta.',503);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const rows:T[]=[];let after='';
  for(let page=0;page<50;page++){
   const url=new URL(`https://graph.facebook.com/v26.0/act_${account}/${edge}`);
   for(const [key,value]of Object.entries({...params,limit:'100',...(after?{after}:{})}))url.searchParams.set(key,value);
   const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),cache:'no-store'});
   const body=await response.json();
   if(!response.ok||body.error){
    const code=Number(body.error?.code);
    if(response.status===429||[4,17,32,613,80004].includes(code))throw new AppError('Meta limitó temporalmente las consultas de esta cuenta. Intenta de nuevo en unos minutos.',429,300);
    throw new AppError(code===190?'La conexión con Meta venció. Actualiza el token.':code===200?'Meta no permite consultar esta cuenta publicitaria. Revisa los activos asignados.':'No pudimos consultar Meta. Intenta de nuevo más tarde.',502);
   }
   if(!Array.isArray(body.data))throw new AppError('Meta devolvió una respuesta incompleta.',502);
   rows.push(...body.data);if(!body.paging?.next)return rows;
   if(!body.paging.cursors?.after||page===49)throw new AppError('La cuenta supera el límite de consulta de Meta. No mostramos resultados parciales.',422);
   after=body.paging.cursors.after;
  }
  return rows;
 }catch(error){if(error instanceof AppError)throw error;throw new AppError('Meta tardó demasiado o no está disponible. Puedes seguir consultando las ventas.',502)}finally{clearTimeout(timer);controller.abort()}
}
