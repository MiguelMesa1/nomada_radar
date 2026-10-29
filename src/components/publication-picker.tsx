'use client';

import {useId, useState} from 'react';
import {normalize} from '@/lib/analytics';
import {catalogDuplicateMessage} from '@/lib/catalog-duplicate';
import type {CatalogPost} from '@/lib/types';

export function PublicationPicker({ads,catalog=[]}: {ads: {id: string; name: string}[];catalog?:CatalogPost[]}) {
 const [query, setQuery] = useState('');
 const [selected, setSelected] = useState('');
 const hintId = useId();
 const search = normalize(query);
 const matches = ads.filter(ad => normalize(`${ad.id} ${ad.name}`).includes(search));
 const existing=search?catalog.filter(post=>normalize(`${post.post_id} ${post.nombre_creativo}`).includes(search)):[];

 return <>
  <label>Buscar publicación
   <input type="search" aria-label="Buscar publicación por ID o nombre" placeholder="Escribe el número del ID o el nombre" value={query} onChange={event => {setQuery(event.target.value); setSelected('');}} autoComplete="off" aria-describedby={hintId}/>
  </label>
  {!!existing.length&&<div role="status" className="notice" style={{display:'block'}}>{existing.slice(0,5).map(post=><p key={post.post_id}>{catalogDuplicateMessage(post)}</p>)}{existing.length>5&&<p>Hay {existing.length} Post IDs registrados que coinciden. Escribe el ID completo para consultar su línea.</p>}</div>}
  <label>Publicación de Meta
   <select name="post_id" aria-label="Publicación de Meta" required value={selected} onChange={event => setSelected(event.target.value)} aria-describedby={hintId}>
    <option value="" disabled>{matches.length ? 'Selecciona una publicación' : 'Sin publicaciones que coincidan'}</option>
    {matches.map(ad => <option key={ad.id} value={ad.id}>{ad.name} · {ad.id}</option>)}
   </select>
  </label>
  <p id={hintId} className="muted small" role="status">{matches.length ? `${matches.length} de ${ads.length} publicaciones disponibles` : existing.length?'Las publicaciones registradas no se pueden agregar de nuevo.':search ? 'No hay coincidencias. Prueba con otra parte del ID o del nombre.' : 'No hay publicaciones disponibles para añadir.'}</p>
 </>;
}
