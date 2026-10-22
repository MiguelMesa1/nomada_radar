import {canonicalLine,isMissingLine,preparedLines} from './classification';
const key=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function lineOptions(...sources:string[][]){
 const result=new Map<string,string>();
 for(const raw of [...preparedLines,...sources.flat()]){
  const line=canonicalLine(raw.replace(/\s+/g,' ').trim());
  if(!isMissingLine(line)&&!result.has(key(line)))result.set(key(line),line);
 }
 return [...result.values()].sort((a,b)=>a.localeCompare(b,'es'));
}
export function newLineName(input:unknown,existing:string[]=[]){
 if(typeof input!=='string')throw Error('Escribe el nombre de la línea.');
 const name=canonicalLine(input.replace(/\s+/g,' ').trim());
 if(isMissingLine(name)||name.length>120)throw Error('Escribe una línea válida de hasta 120 caracteres.');
 if(lineOptions(existing).some(line=>key(line)===key(name)))throw Error('Esa línea ya existe. Puedes seleccionarla en la lista.');
 return name;
}
