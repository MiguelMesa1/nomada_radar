import { canonicalLine, postLine } from './classification';
import type { CatalogPost, Sale } from './types';

export function locationSales(sales: Sale[], catalog: CatalogPost[], line = '', postId = '') {
 const lines = new Map(catalog.map(post => [post.post_id, postLine(post, sales)]));
 return sales.filter(sale => (!postId || sale.post_id === postId) &&
  (!line || (canonicalLine(sale.linea) || lines.get(sale.post_id) || 'Sin línea') === line));
}
