import {describe,expect,it} from 'vitest';
import {isPrivatePath} from './private-paths';
describe('private file paths are rejected before streaming',()=>{
 it('blocks configuration, source folders, hidden paths and encoded variants',()=>{
  for(const path of ['/.env.local','/.insforge/project.json','/.git/config','/src/lib/server.ts','/migrations/schema.sql','/package-lock.json','/%2eenv.local','/%252eenv.local','/api/%2eenv','/tmp/probe','/.well-known/.env'])expect(isPrivatePath(path),path).toBe(true);
 });
 it('keeps app routes, static resources and legitimate well-known paths available',()=>{
  for(const path of ['/inicio','/ingreso','/api/snapshot','/_next/static/chunk.js','/brand/nomada.png','/icon.png','/.well-known/security.txt'])expect(isPrivatePath(path),path).toBe(false);
 });
});
