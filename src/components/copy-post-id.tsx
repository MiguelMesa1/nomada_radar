'use client';
import {useEffect,useState} from 'react';
import {Check,Copy} from 'lucide-react';
const copiedEvent='radar:post-id-copied';

export function CopyPostId({id}:{id:string}){
 const [status,setStatus]=useState<'idle'|'copying'|'copied'|'error'>('idle');
 useEffect(()=>{
  const reset=()=>setStatus(previous=>previous==='copied'?'idle':previous);
  window.addEventListener(copiedEvent,reset);
  return()=>window.removeEventListener(copiedEvent,reset);
 },[]);
 async function copy(){
  setStatus('copying');
  try{await navigator.clipboard.writeText(id);window.dispatchEvent(new Event(copiedEvent));setStatus('copied');}
  catch{setStatus('error');}
 }
 return <span className="copy-post-id">
  <button type="button" className="button small copy-id-button" onClick={copy} disabled={status==='copying'} aria-label={`Copiar Post ID ${id}`}>
   {status==='copied'?<Check size={14} aria-hidden="true"/>:<Copy size={14} aria-hidden="true"/>}
   <span>{status==='copied'?'Copiado':'Copiar'}</span>
  </button>
  <span className={status==='error'?'copy-id-error':'sr-only'} role="status" aria-live="polite">{status==='copied'?`Post ID ${id} copiado`:status==='error'?'No se pudo copiar. Selecciona el ID y cópialo manualmente.':''}</span>
 </span>;
}
