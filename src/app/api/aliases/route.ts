import {protectRequest,protectUser} from '@/lib/security';
import {readJSON} from '@/lib/http-security';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { AppError,failure,requireProfile } from '@/lib/server';
import { normalize } from '@/lib/analytics';
export async function POST(r:Request){try{await protectRequest(r,'write');const {client,profile}=await requireProfile(['principal','analista']);await protectUser(profile.user_id,'write');const schema=z.object({alias:z.string().trim().min(1).max(120),ciudad_canonica:z.string().trim().min(1).max(120),departamento:z.string().trim().min(1).max(120)});const data=schema.safeParse(await readJSON(r));if(!data.success)throw new AppError('Completa los nombres de ciudad y departamento.');const{error}=await client.database.from('city_aliases').upsert([{...data.data,alias:normalize(data.data.alias)}],{onConflict:'alias,departamento'});if(error)throw new AppError('No pudimos guardar el alias.',503);return NextResponse.json({ok:true})}catch(e){return failure(e)}}
