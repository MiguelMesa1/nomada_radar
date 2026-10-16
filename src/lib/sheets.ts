import 'server-only';
import { createSign } from 'node:crypto';
import { AppError } from './server';
async function googleToken(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!email||!key)throw new AppError('Falta conectar la cuenta de servicio de Google. Comparte la hoja como lector con esa cuenta y configura sus credenciales en el servidor.',503);
 const now=Math.floor(Date.now()/1000),b64=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString('base64url');const content=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signer=createSign('RSA-SHA256');signer.update(content);const assertion=content+'.'+signer.sign(key,'base64url');
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new AppError('No se pudo autenticar la cuenta de servicio de Google. Revisa sus credenciales.',503);
 const data=await r.json();return data.access_token as string;
}
export async function readSheets(){
 const token=await googleToken(),id=process.env.GOOGLE_SHEET_ID,tabs=(process.env.GOOGLE_SHEET_TABS??'Septiembre,Octubre').split(',').map(t=>t.trim()).filter(Boolean);
 if(!id||!/^[\w-]+$/.test(id))throw new AppError('Falta el ID válido de Google Sheets.',503);
 const params=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'FORMATTED_STRING'});
 tabs.forEach(t=>params.append('ranges',`'${t.replace(/'/g,"''")}'!A1:AZ100001`));
 const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw new AppError(r.status===403?'La cuenta de servicio no tiene acceso de lector a la hoja.':'No pudimos leer las pestañas de Sheets. Se mantiene la última carga.',503);
 const data=await r.json();return tabs.map((name,i)=>{const rows=(data.valueRanges?.[i]?.values??[]) as unknown[][];if(rows.length>=100001)throw new AppError('La hoja excede el límite de esta importación. Ajusta el rango antes de continuar.',422);return {name,rows}});
}
