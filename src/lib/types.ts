export type Role = 'principal' | 'analista' | 'visualizador';
export type CatalogPost = { post_id: string; nombre_creativo: string; campana: string; producto: string; plataforma: string; activo: boolean; fecha_inicio: string; publicacion_url?:string|null; meta?:import('./meta-ad-data').MetaAd };
export type Sale = { linea_importada?:string; pedido_id: string; fecha_venta: string; post_id: string; ciudad_original: string; ciudad_normalizada: string; departamento: string; importe_cop: number | null; estado: string; linea: string };
export type SyncRun = { id: string; started_at: string; completed_at: string | null; status: string; filas_leidas: number; filas_validas: number; error: string | null };
export type Profile = { user_id: string; nombre: string; email: string; role: Role; activo: boolean };
export type InteractionCount={post_id:string;mes:string;interacciones:number;updated_at?:string};
export type Snapshot = { sessionExpiresAt?:number; catalog: CatalogPost[]; lines?:string[]; sales: Sale[]; runs: SyncRun[]; profile: Profile; interactions?:InteractionCount[]; dailyInteractions?:import('./dated-interactions').DatedInteractionMonth[]; mode: 'demo' | 'live' };
export type PostMetric = CatalogPost & { orders: number; value: number; ticket: number | null; pricedOrders: number; pendingTotals: number; share: number; trend: number[]; previous: number };
