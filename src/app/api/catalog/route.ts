import {protectRequest,protectUser} from '@/lib/security';
import {readJSON} from '@/lib/http-security';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { AppError,failure,requireProfile } from '@/lib/server';
const schema=z.object({post_id:z.string().trim().min(1).max(100).transform(s=>s.toUpperCase()),nombre_creativo:z.string().trim().min(1).max(180),campana:z.string().max(120),producto:z.string().max(120),marca:z.string().trim().max(120).optional(),plataforma:z.enum(['Instagram','Facebook','TikTok','Otra']),activo:z.boolean(),fecha_inicio:z.iso.date()});
async function mutate(r:Request,edit:boolean){try{await protectRequest(r,'write');const {client,profile}=await requireProfile(['principal','analista']);await protectUser(profile.user_id,'write');const parsed=schema.safeParse(await readJSON(r));if(!parsed.success)throw new AppError('Revisa los campos del Post ID.');const result=edit?await client.database.from('post_catalog').update(parsed.data).eq('post_id',parsed.data.post_id).select('post_id').single():await client.database.from('post_catalog').insert([parsed.data]).select('post_id').single();if(result.error)throw new AppError(result.error.code==='23505'?'Ese Post ID ya está registrado.':'No pudimos guardar el Post ID.',409);return NextResponse.json({ok:true})}catch(e){return failure(e)}}
export async function POST(r:Request){return mutate(r,false)}
export async function PATCH(r:Request){return mutate(r,true)}
