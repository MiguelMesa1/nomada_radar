'use client';
import {useEffect} from 'react';
import {ACTIVITY_KEY,IDLE_TIMEOUT_MS} from '@/lib/idle-session';

export function IdleSession({expiresAt,userId}:{expiresAt:number;userId:string}){
 useEffect(()=>{
  const key=ACTIVITY_KEY+':'+userId;
  let lastActivity=expiresAt-IDLE_TIMEOUT_MS,stopped=false,sending=false,lastSent=0,dirty=false;
  const read=()=>{try{const value=Number(localStorage.getItem(key));if(value>lastActivity&&value<=Date.now())lastActivity=value}catch{}};
  const expire=()=>{
   if(stopped)return;stopped=true;
   try{localStorage.setItem(key,'expired')}catch{}
   // Hide sensitive content immediately, even if the connection is offline.
   document.body.style.visibility='hidden';
   void fetch('/api/auth/sign-out',{method:'POST',keepalive:true,signal:AbortSignal.timeout(10000)}).catch(()=>{}).finally(()=>window.location.replace('/ingreso?motivo=inactividad'));
  };
  const check=()=>{read();if(Date.now()-lastActivity>=IDLE_TIMEOUT_MS)expire()};
  const send=async()=>{
   if(stopped||sending||!dirty||Date.now()-lastSent<15000)return;
   // A delayed retry must not keep an unattended session alive.
   if(Date.now()-lastActivity>15000){dirty=false;return}
   sending=true;dirty=false;lastSent=Date.now();
   try{const response=await fetch('/api/auth/activity',{method:'POST',signal:AbortSignal.timeout(10000)});if(response.status===401)expire();else if(!response.ok)dirty=true}catch{dirty=true}finally{sending=false}
  };
  const activity=()=>{
   check();if(stopped)return;
   lastActivity=Date.now();dirty=true;
   try{localStorage.setItem(key,String(lastActivity))}catch{}
   void send();
  };
  const storage=(event:StorageEvent)=>{if(event.key!==key)return;if(event.newValue==='expired')expire();else check()};
  const resume=()=>{if(document.visibilityState==='visible')check()};
  const events=['pointerdown','pointermove','keydown','scroll','touchstart'] as const;
  // Limit writes during continuous mouse movement and scrolling.
  let lastEvent=0;
  const onActivity=()=>{if(Date.now()-lastEvent<1000)return;lastEvent=Date.now();activity()};
  read();check();
  const timer=setInterval(()=>{check();void send()},1000);
  events.forEach(name=>window.addEventListener(name,onActivity,{passive:true}));
  window.addEventListener('storage',storage);window.addEventListener('focus',check);document.addEventListener('visibilitychange',resume);
  return()=>{stopped=true;clearInterval(timer);events.forEach(name=>window.removeEventListener(name,onActivity));window.removeEventListener('storage',storage);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',resume)};
 },[expiresAt,userId]);
 return null;
}
