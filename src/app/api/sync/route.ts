import {protectRequest,protectUser} from '@/lib/security';
import { NextResponse } from 'next/server';
import { AppError,failure,requireProfile } from '@/lib/server';
import { triggerSheetsSync } from '@/lib/sync-trigger';
export const maxDuration=120;
export async function POST(request:Request){try{
 await protectRequest(request,'sync');const {profile}=await requireProfile(['principal','analista']);await protectUser(profile.user_id,'sync');
 const url=process.env.GOOGLE_APPS_SCRIPT_SYNC_URL,token=process.env.GOOGLE_APPS_SCRIPT_SYNC_TOKEN;
 if(!url||!token)throw new AppError('Falta habilitar la actualización inmediata de Google Sheets. Mientras tanto usa Nómada Radar → Sincronizar ahora en el Excel; la carga horaria sigue disponible.',503);
 const result=await triggerSheetsSync(url,token);
 return NextResponse.json({ok:true,message:`Carga terminada: ${result.orders} ventas. El informe ya consulta los datos nuevos.`});
}catch(e){return failure(e instanceof AppError?e:new AppError(e instanceof Error&&e.name==='TimeoutError'?'Google está tardando más de lo esperado. Espera un momento y vuelve a actualizar.':'No se pudo actualizar desde Google Sheets. Intenta de nuevo más tarde.',502));}}
