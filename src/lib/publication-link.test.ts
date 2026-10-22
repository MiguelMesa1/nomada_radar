import {describe,expect,it} from 'vitest';
import {publicationLink} from './publication-link';
import {buildLineAssignment} from './line-assignment';
import type {CatalogPost} from './types';

describe('social publication links',()=>{
 it('detects each network from the URL and preserves its path and query',()=>{
  expect(publicationLink(' https://www.facebook.com/share/p/abc/?mibextid=123 ')).toEqual({network:'Facebook',url:'https://www.facebook.com/share/p/abc/?mibextid=123'});
  expect(publicationLink('https://m.facebook.com/story.php?story_fbid=123')).toMatchObject({network:'Facebook'});
  expect(publicationLink('https://fb.watch/abc/')).toMatchObject({network:'Facebook'});
  expect(publicationLink('https://www.instagram.com/reel/abc/')).toMatchObject({network:'Instagram'});
 });
 it('does not expose empty, unsafe, disguised or unsupported links',()=>{
  for(const value of [null,undefined,'','  ','javascript:alert(1)','data:text/html,test','http://facebook.com/p/1','https://facebook.com.evil.test/','https://fakefacebook.com/','https://instagram.com@evil.test/','https://u:p@facebook.com/','https://instagram.com:8080/p/abc/','https://other.test/?url=instagram.com','https://facebook.com/'+ 'a'.repeat(2048)])expect(publicationLink(value)).toBeNull();
 });
 it('keeps the saved link when assigning a different line',()=>{
  const target:CatalogPost={post_id:'A',nombre_creativo:'Video',campana:'',producto:'Sin línea',plataforma:'Facebook',fecha_inicio:'2026-10-20',activo:true,publicacion_url:'https://facebook.com/share/abc/'};
  expect(buildLineAssignment(target,[target],'NS','2026-10-20').post.publicacion_url).toBe(target.publicacion_url);
 });
});
