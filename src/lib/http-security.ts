import {AppError} from './errors';

export const MAX_JSON_BYTES=16384;
export function validateRequestSize(request:Request,max=MAX_JSON_BYTES){
 if(request.url.length>4096)throw new AppError('La solicitud es demasiado larga.',414);
 const length=request.headers.get('content-length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>max))throw new AppError('La solicitud supera el tamaño permitido.',413);
 if(request.headers.has('content-encoding')&&request.headers.get('content-encoding')!=='identity')throw new AppError('Formato de solicitud no permitido.',415);
}
export async function readJSON(request:Request,max=MAX_JSON_BYTES):Promise<unknown>{
 validateRequestSize(request,max);
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new AppError('Envía los datos en formato JSON.',415);
 const reader=request.body?.getReader();if(!reader)throw new AppError('Faltan los datos de la solicitud.');
 const chunks:Uint8Array[]=[];let size=0;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new AppError('La solicitud tardó demasiado.',408));void reader.cancel().catch(()=>{})},5000)});
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;if(size>max){void reader.cancel().catch(()=>{});throw new AppError('La solicitud supera el tamaño permitido.',413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new AppError('Los datos enviados no son válidos.')}
 }finally{clearTimeout(timer);reader.releaseLock()}
}

// A bounded local fuse complements the shared database counters; it is not
// the authoritative limit across instances. Denied calls never extend a ban.
export class BurstLimiter {
 private entries=new Map<string,{count:number;until:number}>();
 constructor(private capacity=2048){}
 consume(key:string,limit:number,seconds:number,now=Date.now()){
  let entry=this.entries.get(key);
  if(!entry||entry.until<=now){
   if(!entry&&this.entries.size>=this.capacity){for(const [k,v] of this.entries)if(v.until<=now)this.entries.delete(k);if(this.entries.size>=this.capacity)return {allowed:false,retryAfter:seconds}}
   entry={count:0,until:now+seconds*1000};this.entries.set(key,entry);
  }
  const allowed=entry.count<limit;if(allowed)entry.count++;
  return {allowed,retryAfter:Math.max(1,Math.ceil((entry.until-now)/1000))};
 }
}
