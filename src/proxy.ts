import {NextResponse,type NextRequest} from 'next/server';
import {BurstLimiter} from '@/lib/http-security';
import {isPrivatePath} from '@/lib/private-paths';
import {requestIdentity} from '@/lib/request-identity';
const fuse=new BurstLimiter();
export async function proxy(request:NextRequest){
 if(isPrivatePath(request.nextUrl.pathname))return new NextResponse(null,{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 // Cheap local fuse; API routes enforce authoritative shared limits before auth.
 if(!fuse.consume('ingress:'+requestIdentity(request),600,60).allowed)return NextResponse.json({error:'Demasiadas solicitudes. Intenta más tarde.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
 const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
 const dev=process.env.NODE_ENV!=='production';
 const policy=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https://*.fbcdn.net https://*.cdninstagram.com","font-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'",`connect-src 'self'${dev?' ws: wss:':''}`].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',policy);
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 response.headers.set('Cross-Origin-Opener-Policy','same-origin');
 // Authenticated HTML and API responses must not be stored by shared caches.
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 response.headers.set('Pragma','no-cache');
 response.headers.set('Expires','0');
 response.headers.set('X-Robots-Tag','noindex, nofollow');
 if(process.env.NODE_ENV==='production')response.headers.set('Strict-Transport-Security','max-age=31536000');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|brand|fonts|favicon.ico|icon.png).*)']};
