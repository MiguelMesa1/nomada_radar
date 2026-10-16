import {describe,it,expect} from 'vitest';
import {isSameOrigin} from './request-origin';
describe('Validación del origen público',()=>{
 it('admite la URL pública cuando Next usa un hostname interno',()=>expect(isSameOrigin(new Request('http://localhost:3000/api/auth/sign-in',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}}))).toBe(true));
 it('rechaza dominios distintos aunque el hostname interno coincida',()=>expect(isSameOrigin(new Request('http://localhost:3000/api/catalog',{headers:{host:'127.0.0.1:3000',origin:'http://evil.example'}}))).toBe(false));
 it('rechaza peticiones sin Origin',()=>expect(isSameOrigin(new Request('http://127.0.0.1:3000/api/catalog'))).toBe(false));
 it('rechaza un puerto distinto y orígenes inválidos',()=>{for(const origin of ['http://127.0.0.1:4000','null','http://127.0.0.1:3000/extra'])expect(isSameOrigin(new Request('http://localhost:3000/api/catalog',{headers:{host:'127.0.0.1:3000',origin}}))).toBe(false)});
});
