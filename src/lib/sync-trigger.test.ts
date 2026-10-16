import {afterEach,describe,it,expect,vi} from 'vitest';
import {validAppsScriptUrl,triggerSheetsSync} from './sync-trigger';
afterEach(()=>vi.unstubAllGlobals());
describe('Protected immediate Sheets sync',()=>{
 const url='https://script.google.com/macros/s/deployment_123/exec';
 it('accepts only exact Google Apps Script production URLs',()=>{
  expect(validAppsScriptUrl(url)).toBe(true);
  for(const invalid of ['https://example.com/exec','http://script.google.com/macros/s/test/exec',url+'?token=secret',url.replace('/exec','/dev'),'http://127.0.0.1:3000'])expect(validAppsScriptUrl(invalid)).toBe(false);
 });
 it('sends the private token server-side and waits for the actual import result',async()=>{
  const fetch=vi.fn().mockResolvedValue(Response.json({ok:true,orders:12}));vi.stubGlobal('fetch',fetch);
  expect(await triggerSheetsSync(url,'private-token')).toMatchObject({orders:12});
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({action:'sync',token:'private-token'});
 });
 it('never announces success for import errors or a Google login page',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({ok:false,error:'Fecha inválida'})).mockResolvedValueOnce(new Response('<html>Login</html>')));
  await expect(triggerSheetsSync(url,'x')).rejects.toThrow('Fecha inválida');
  await expect(triggerSheetsSync(url,'x')).rejects.toThrow('solicitó iniciar sesión');
 });
});
