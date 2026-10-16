import type { Metadata } from 'next';
import './globals.css';
import './polish.css';
import { ThemeToggle } from '@/components/theme-toggle';
import {headers} from 'next/headers';
export const metadata: Metadata = { title: 'Nómada Radar · Analítica', description:'Pedidos, valor y ciudades por cada Post ID. Nómada Moto Partes.', robots:{index:false,follow:false} };
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('nomada-theme-v1')==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}`;
export default async function Layout({children}:{children:React.ReactNode}) { const nonce=(await headers()).get('x-nonce')??undefined;return <html lang="es" data-theme="dark" suppressHydrationWarning><head><script nonce={nonce} dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}<ThemeToggle/></body></html>; }
