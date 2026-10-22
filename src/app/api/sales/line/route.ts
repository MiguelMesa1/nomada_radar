import {NextResponse} from 'next/server';
import {z} from 'zod';
import {protectRequest,protectUser} from '@/lib/security';
import {readJSON} from '@/lib/http-security';
import {failure,requireProfile,AppError} from '@/lib/server';
import {canonicalLine,isMissingLine} from '@/lib/classification';
const schema=z.object({pedido_id:z.string().min(1).max(500),fecha_venta:z.iso.datetime({offset:true}),linea:z.string().trim().min(1).max(120)});
export async function POST(request:Request){try{
 await protectRequest(request,'write');
 const {client,profile}=await requireProfile(['principal','analista']);await protectUser(profile.user_id,'write');
 const parsed=schema.safeParse(await readJSON(request));
 if(!parsed.success)throw new AppError('Revisa la venta y la línea seleccionada.');
 const input={...parsed.data,linea:canonicalLine(parsed.data.linea)};
 if(isMissingLine(input.linea))throw new AppError('Selecciona o escribe una línea válida.');
 const sale=await client.database.from('sales_orders').select('pedido_id,post_id').eq('pedido_id',input.pedido_id).eq('fecha_venta',input.fecha_venta).single();
 if(sale.error||!sale.data)throw new AppError('La venta cambió o ya no está disponible. Actualiza el informe.',409);
 if(sale.data.post_id)throw new AppError('Esta venta tiene Post ID. Cambia la línea de su publicación.',409);
 const result=await client.database.from('sale_line_overrides').upsert([{...input,updated_by:profile.user_id,updated_at:new Date().toISOString()}],{onConflict:'pedido_id,fecha_venta'});
 if(result.error)throw new AppError('No pudimos guardar la línea de la venta. Intenta de nuevo.',503);
 return NextResponse.json({ok:true,...input},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error)}}
