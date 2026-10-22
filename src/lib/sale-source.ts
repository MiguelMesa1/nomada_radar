// Imports retain the original row offset, including blank spreadsheet rows.
export function saleSource(orderId:string){
 const match=/^__fila__:([\w-]{20,100}):(\d+):(\d+)$/.exec(orderId);
 if(match){
  const [,,sheet,rowText]=match,row=Number(rowText);
  if(!Number.isSafeInteger(row)||row<2)return null;
  return {row,label:`Hoja ${sheet} · fila ${row}`};
 }
 const legacy=/^__fila__:(.+):(\d+)$/.exec(orderId);
 if(!legacy)return null;
 const row=Number(legacy[2]);
 return Number.isSafeInteger(row)&&row>=2?{row,label:`${legacy[1]} · fila ${row}`}:null;
}
