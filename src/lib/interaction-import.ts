export type MonthlyInteractions={mes:string;rows:{post_id:string;interacciones:number}[]};
// Pure adapter shared with the Apps Script source and the connector import.
export function parseInteractionBlocks(cells:unknown[][],year:number):MonthlyInteractions[]{
 if(!Number.isInteger(year)||year<2000||year>2199)throw Error('Falta el año del archivo de interacciones.');
 const clean=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const months:Record<string,string>={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
 const groups:MonthlyInteractions[]=[];const used=new Set<string>();
 for(let c=0;c<(cells[0]?.length??0);c++){
  const title=clean(cells[0][c]);if(!title)continue;
  let month:string;
  if(title==='interacciones'&&/^\d{4}-(?:0[1-9]|1[0-2])$/.test(String(cells[0][c+1]??'')))month=String(cells[0][c+1]);
  else{const match=/^interacciones\s+(\w+)(?:\s+(20\d{2}))?$/.exec(title);if(!match||!months[match[1]]){if(/^interacciones/.test(title))throw Error('El bloque de interacciones necesita un nombre de mes válido.');continue;}month=`${match[2]??year}-${months[match[1]]}`;}
  if(used.has(month))throw Error('Hay dos bloques de interacciones para '+month);used.add(month);
  const idHeader=clean(cells[1]?.[c]),countHeader=clean(cells[1]?.[c+1]);
  if(!['post id','post_id'].includes(idHeader)||countHeader!=='interacciones')throw Error('Cada bloque necesita Post ID e Interacciones en la fila 2.');
  const entries=new Map<string,number>();
  for(let r=2;r<cells.length;r++){
   const id=String(cells[r][c]??'').trim().toUpperCase(),raw=cells[r][c+1];
   if(!id&&(raw==null||raw===''))continue;
   if(!id)throw Error('Hay interacciones sin Post ID.');
   if(raw==null||raw==='')continue;
   const count=typeof raw==='number'?raw:/^\d+$/.test(String(raw).trim())?Number(raw):NaN;
   if(!Number.isSafeInteger(count)||count<0)throw Error('Interacciones inválidas para '+id);
   if(entries.has(id)&&entries.get(id)!==count)throw Error('Hay dos cantidades de interacciones para '+id+' en '+month);
   entries.set(id,count);
  }
  groups.push({mes:month,rows:[...entries].map(([post_id,interacciones])=>({post_id,interacciones}))});
 }
 if(!groups.length)throw Error('No se encontraron bloques mensuales de interacciones.');
 return groups;
}
