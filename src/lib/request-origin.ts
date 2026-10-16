export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin||request.headers.get('sec-fetch-site')==='cross-site') return false;
  try {
    const url = new URL(request.url);
    if(new URL(origin).origin!==origin)return false;
    const configured=process.env.RADAR_APP_ORIGIN||(process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'');
    if(configured)return origin===new URL(configured).origin;
    // Next can use localhost internally while a browser uses 127.0.0.1.
    // That development exception never admits an arbitrary Host header.
    const loopback=(hostname:string)=>['localhost','127.0.0.1','[::1]'].includes(hostname);
    const candidate=new URL(origin),host=new URL(`${url.protocol}//${request.headers.get('host')??url.host}`);
    return loopback(url.hostname)&&loopback(host.hostname)&&loopback(candidate.hostname)&&candidate.origin===host.origin&&candidate.port===url.port;
  } catch {
    return false;
  }
}
