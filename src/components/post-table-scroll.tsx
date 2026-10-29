'use client';

import {useEffect, useId, useRef, useState, type ReactNode, type PointerEvent, type KeyboardEvent, type MouseEvent} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';

export function PostTableScroll({children}: {children: ReactNode}) {
 const viewport = useRef<HTMLDivElement>(null);
 const id = useId();
 const [scroll, setScroll] = useState({left: 0, max: 0});
 const movement = useRef(0);

 function stopMoving() {
  cancelAnimationFrame(movement.current);
  movement.current = 0;
 }

 useEffect(() => {
  const onVisibilityChange = () => {if (document.hidden) stopMoving();};
  window.addEventListener('blur', stopMoving);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
   stopMoving();
   window.removeEventListener('blur', stopMoving);
   document.removeEventListener('visibilitychange', onVisibilityChange);
  };
 }, []);

 useEffect(() => {
  const element = viewport.current;
  if (!element) return;
  const heading = element.querySelector('thead');
  let frame = 0;
  const pinHeading = () => {
   frame = 0;
   if (!heading) return;
   const controls = element.parentElement?.querySelector('.posts-scroll-controls');
   const top = 12 + (controls?.getBoundingClientRect().height ?? 0) + 8;
   const offset = Math.max(0, Math.min(top - element.getBoundingClientRect().top - 1, element.scrollHeight - heading.offsetHeight));
   heading.style.transform = `translateY(${offset}px)`;
  };
  const schedulePin = () => {if (!frame) frame = requestAnimationFrame(pinHeading);};
  const update = () => {
   setScroll({left: element.scrollLeft, max: Math.max(0, element.scrollWidth - element.clientWidth)});
   schedulePin();
  };
  const observer = new ResizeObserver(update);
  observer.observe(element);
  if (element.firstElementChild) observer.observe(element.firstElementChild);
  element.addEventListener('scroll', update, {passive: true});
  window.addEventListener('scroll', schedulePin, {passive: true});
  window.addEventListener('resize', schedulePin);
  update();
  return () => {
   observer.disconnect();
   element.removeEventListener('scroll', update);
   window.removeEventListener('scroll', schedulePin);
   window.removeEventListener('resize', schedulePin);
   cancelAnimationFrame(frame);
   if (heading) heading.style.transform = '';
  };
 }, []);

 function step(direction: number) {
  const element = viewport.current;
  if (element) element.scrollBy({left: direction * 40, behavior: 'instant'});
 }

 function startMoving(direction: number) {
  stopMoving();
  step(direction);
  let previous = performance.now();
  const advance = (now: number) => {
   const element = viewport.current;
   if (!element) {stopMoving(); return;}
   // Pixels per second, independent of display refresh rate. Cap long frames
   // so a stalled or background tab cannot jump across the remaining columns.
   element.scrollBy({left: direction * 180 * Math.min(now - previous, 40) / 1000, behavior: 'instant'});
   previous = now;
   if (direction < 0 ? element.scrollLeft <= 1 : element.scrollLeft >= element.scrollWidth - element.clientWidth - 1) {
    stopMoving();
    return;
   }
   movement.current = requestAnimationFrame(advance);
  };
  movement.current = requestAnimationFrame(advance);
 }

 function arrowControls(direction: number) {
  return {
   style: {touchAction: 'none'},
   title: 'Mantén oprimido para desplazar; suelta para detener',
   onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    startMoving(direction);
   },
   onPointerUp: stopMoving,
   onPointerCancel: stopMoving,
   onLostPointerCapture: stopMoving,
   onBlur: stopMoving,
   onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) startMoving(direction);
   },
   onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    stopMoving();
   },
   onClick: (event: MouseEvent<HTMLButtonElement>) => {
    // Pointer/keyboard presses already moved the table. Keep click activation
    // available for assistive technologies without adding a jump on release.
    if (event.detail === 0) step(direction);
   },
  };
 }

 return <div className="posts-scroll-shell posts-desktop">
  {scroll.max > 1 && <div className="posts-scroll-controls">
   <span>Mantén oprimidas las flechas para ver las columnas</span>
   <div className="posts-scroll-navigation">
    <button type="button" className="icon-button" aria-label="Ver columnas anteriores" aria-controls={id} disabled={scroll.left <= 1} {...arrowControls(-1)}><ChevronLeft size={18}/></button>
    <input type="range" min="0" max={scroll.max} value={scroll.left} aria-label="Desplazar columnas de Post ID" aria-controls={id} onChange={event => viewport.current?.scrollTo({left: Number(event.target.value)})}/>
    <button type="button" className="icon-button" aria-label="Ver columnas siguientes" aria-controls={id} disabled={scroll.left >= scroll.max - 1} {...arrowControls(1)}><ChevronRight size={18}/></button>
   </div>
  </div>}
  <div ref={viewport} id={id} className="table-wrap posts-scroll-viewport" role="region" aria-label="Tabla de Post ID, desplazable horizontalmente" tabIndex={0}>{children}</div>
 </div>;
}
