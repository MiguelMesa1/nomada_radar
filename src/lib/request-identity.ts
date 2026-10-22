import {isIP} from 'node:net';

// A client-supplied forwarding header is not a trusted identity. Enable one
// only when the deployment proxy overwrites it and blocks direct connections.
export function requestIdentity(request:Request){
 const header=process.env.VERCEL==='1'?'x-vercel-forwarded-for':process.env.RADAR_TRUST_PROXY_HEADER;
 if(header&&['x-vercel-forwarded-for','x-real-ip','x-forwarded-for'].includes(header)){
  const candidate=request.headers.get(header)?.split(',')[0]?.trim();
  if(candidate&&isIP(candidate))return candidate;
 }
 return 'shared-origin';
}
