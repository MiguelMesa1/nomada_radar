import {NextResponse} from 'next/server';
import {z} from 'zod';
import {protectRequest,protectUser} from '@/lib/security';
import {readJSON} from '@/lib/http-security';
import {failure,requireProfile,AppError} from '@/lib/server';
import {newLineName} from '@/lib/line-options';
export async function POST(request:Request){try{
 await protectRequest(request,'write');
 const {client,profile}=await requireProfile(['principal','analista']);await protectUser(profile.user_id,'write');
 const parsed=z.object({nombre:z.string().trim().min(1).max(120)}).safeParse(await readJSON(request));
 if(!parsed.success)throw new AppError('Escribe una línea válida de hasta 120 caracteres.');
 const existing=await client.database.from('line_catalog').select('nombre').limit(1001);
 if(existing.error)throw new AppError('No pudimos consultar las líneas. Intenta de nuevo.',503);
 if((existing.data?.length??0)>=1000)throw new AppError('El catálogo alcanzó su límite de líneas.',422);
 let nombre:string;try{nombre=newLineName(parsed.data.nombre,(existing.data??[]).map(row=>row.nombre))}catch(error){throw new AppError((error as Error).message,409)}
 const result=await client.database.from('line_catalog').insert([{nombre}]).select('nombre').single();
 if(result.error)throw new AppError(result.error.code==='23505'?'Esa línea ya existe. Puedes seleccionarla en la lista.':'No pudimos guardar la línea. Intenta de nuevo.',result.error.code==='23505'?409:503);
 return NextResponse.json({nombre:result.data.nombre},{status:201,headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error)}}
