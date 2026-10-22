import {ArrowUpRight,Hash,LayoutDashboard,List,MapPin,MousePointerClick,ShieldCheck,Tags,Users} from 'lucide-react';

// Shared by the report and its loading shell so their menus stay in sync.
export const reportNavigation = [
 {id:'inicio',name:'Inicio',icon:LayoutDashboard,sub:'Resumen'},
 {id:'post-id',name:'Post ID',icon:Hash,sub:'Rendimiento por publicación'},
 {id:'lineas',name:'Líneas',icon:Tags,sub:'Ventas y publicaciones por línea'},
 {id:'interacciones',name:'Interacciones',icon:MousePointerClick,sub:'Consultas y conversión por publicación'},
 {id:'conversion',name:'Conversión',icon:ArrowUpRight,sub:'Validación de conversión por línea'},
 {id:'ubicaciones',name:'Ubicaciones',icon:MapPin,sub:'Destino de los pedidos'},
 {id:'calidad',name:'Calidad',icon:ShieldCheck,sub:'Datos y sincronización'},
 {id:'catalogo',name:'Catálogo',icon:List,sub:'Post ID registrados'},
 {id:'administracion',name:'Administración',icon:Users,sub:'Usuarios y accesos'},
];
