export type DatedInteractionMonth={mes:string;sin_fecha:number;rows:{post_id:string;fecha:string;interacciones:number}[];updated_at?:string};
export function parseDatedInteractions(cells:unknown[][],year:number):DatedInteractionMonth[]{
 if(!Number.isInteger(year)||year<2000||year>2199)throw Error('Año inválido para Todos los ID.');
 const norm=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const headers=(cells[0]??[]).map(norm),idCol=headers.findIndex(h=>['# id','post id','post_id','id'].includes(h)),dateCol=headers.indexOf('fecha'),monthCol=headers.indexOf('mes');
 if(idCol<0)throw Error('Todos los ID necesita una columna # ID.');
 if(dateCol<0)return [];
 const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
 const groups=months.map((_,m)=>({mes:`${year}-${String(m+1).padStart(2,'0')}`,sin_fecha:0,counts:new Map<string,{post_id:string;fecha:string;interacciones:number}>()}));
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota'});
 for(let i=1;i<cells.length;i++){
  const row=cells[i],id=String(row[idCol]??'').trim().toUpperCase(),raw=row[dateCol];
  if(!id){if(String(raw??'').trim())throw Error('Hay una fecha sin Post ID en Todos los ID.');continue;}
  if(raw==null||String(raw).trim()===''){
   const text=norm(row[monthCol]),index=months.indexOf(text==='setiembre'?'septiembre':text),isoMonth=/^\d{4}-(0[1-9]|1[0-2])$/.test(text)?Number(text.slice(-2))-1:-1;
   const m=index>=0?index:isoMonth;if(m<0)throw Error('Una interacción sin fecha tampoco tiene un mes válido.');groups[m].sin_fecha++;continue;
  }
  let value=raw;
  if(Object.prototype.toString.call(raw)!=='[object Date]'){
   let text=String(raw).trim();const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
   if(match)text=`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
   if(/^\d{4}-\d{2}-\d{2}$/.test(text))text+='T12:00:00-05:00';
   const parts=/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(text);
   if(!parts)throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
   const y=Number(parts[1]),m=Number(parts[2]),d=Number(parts[3]),check=new Date(Date.UTC(y,m-1,d));
   if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
   value=new Date(text);
  }
  const instant=value as Date;if(!Number.isFinite(instant.getTime()))throw Error('Fecha inválida en Todos los ID, fila '+(i+1));
  const day=formatter.format(instant);if(!day.startsWith(String(year)+'-'))throw Error('Hay una interacción fuera del año del archivo en Todos los ID.');
  const group=groups[Number(day.slice(5,7))-1],key=id+'|'+day,entry=group.counts.get(key)??{post_id:id,fecha:day,interacciones:0};
  entry.interacciones++;group.counts.set(key,entry);
 }
 return groups.map(g=>({mes:g.mes,sin_fecha:g.sin_fecha,rows:[...g.counts.values()]}));
}
