import type { Snapshot, CatalogPost, Sale } from './types';
import { colombiaDay } from './analytics';
export const demoCatalog: CatalogPost[] = [
 ['IG-240811','Reel kit arrastre AKT 125','Kits arrastre','Kit arrastre','Instagram','2026-09-02'],
 ['FB-240802','Carrusel pastillas de freno','Frenos','Pastillas','Facebook','2026-08-28'],
 ['IG-240815','POV ruta Boyacá · llantas','Llantas','Llanta 90/90','Instagram','2026-09-05'],
 ['TT-240820','Unboxing farola LED','Iluminación','Farola LED','TikTok','2026-09-09'],
 ['IG-240799','Testimonio Pulsar NS 200','Confianza','Kit clutch','Instagram','2026-08-20'],
 ['FB-240777','Promo aceite 20W50','Lubricantes','Aceite','Facebook','2026-08-12'],
 ['TT-240823','Antes y después espejos','Accesorios','Espejos','TikTok','2026-09-14'],
 ['IG-240760','Reel batería sellada','Eléctrico','Batería','Instagram','2026-08-01'],
 ['FB-240741','Carrusel cadenas reforzadas','Kits arrastre','Cadena','Facebook','2026-07-22'],
 ['IG-240830','Historia empaque y envío','Confianza','Empaque','Instagram','2026-10-08'],
 ['TT-240828','Reto 1.000 km','Comunidad','Comunidad','TikTok','2026-10-06']
].map(([post_id,nombre_creativo,campana,producto,plataforma,fecha_inicio])=>({post_id,nombre_creativo,campana,producto,plataforma,fecha_inicio,activo:post_id!=='FB-240741'}));
export const demoCities = [ ['Bogotá','Cundinamarca',4.71,-74.07],['Medellín','Antioquia',6.24,-75.58],['Cali','Valle del Cauca',3.45,-76.53],['Barranquilla','Atlántico',10.98,-74.78],['Bucaramanga','Santander',7.12,-73.12],['Ibagué','Tolima',4.44,-75.23],['Pereira','Risaralda',4.81,-75.69],['Villavicencio','Meta',4.15,-73.64],['Cúcuta','Norte de Santander',7.89,-72.5],['Tunja','Boyacá',5.53,-73.36],['Pasto','Nariño',1.21,-77.28],['Neiva','Huila',2.94,-75.28] ] as const;
export function demoSnapshot(): Snapshot {
  const sales: Sale[] = [], counts = [148,121,97,84,63,58,41,29,17,0,0,34], prices=[189000,62000,238000,145000,121000,38000,54000,168000,96000,0,0,89000];
  let index = 0;
  for (let period=0;period<2;period++) counts.forEach((count,p)=>{
    for (let i=0;i<Math.round(count*(period?0.82:1));i++) {
      const n=index++, city=demoCities[(n*17%100)<26?0:(n*13%100)<30?1:(n*7%100)<28?2:3+n%9];
      const d=new Date(); d.setUTCDate(d.getUTCDate()-(i*7+p*3)%30-period*30);
      sales.push({pedido_id:`DEMO-${period}-${n}`,fecha_venta:colombiaDay(d)+'T12:00:00-05:00',post_id:demoCatalog[p]?.post_id??'',ciudad_original:city[0],ciudad_normalizada:city[0],departamento:city[1],importe_cop:prices[p],estado:'confirmado',linea:['AKT','Bajaj','Yamaha','Honda','Suzuki','TVS'][n%100<31?0:n%100<55?1:n%100<72?2:3+n%3]});
    }
  });
  return { mode:'demo',catalog:demoCatalog,sales,runs:[],profile:{user_id:'demo',nombre:'Vista de demostración',email:'',role:'principal',activo:true} };
}
