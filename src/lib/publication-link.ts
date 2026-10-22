export const publicationLinkError='Usa un enlace HTTPS de Facebook o Instagram.';

/** Only return links that can safely be opened as social publications. */
export function publicationLink(value:unknown){
 if(typeof value!=='string'||!value.trim()||value.trim().length>2048)return null;
 try{
  const url=new URL(value.trim());
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();
  const network=host==='facebook.com'||host.endsWith('.facebook.com')||host==='fb.watch'?'Facebook':host==='instagram.com'||host.endsWith('.instagram.com')?'Instagram':null;
  return network?{url:url.href,network}:null;
 }catch{return null}
}
