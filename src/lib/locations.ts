import { canonicalLine, postLine, saleLine } from './classification';
import type { CatalogPost, Sale } from './types';
import {normalize} from './analytics';

export function locationSales(sales: Sale[], catalog: CatalogPost[], line = '', postId = '') {
 const lines = new Map(catalog.map(post => [post.post_id, postLine(post, sales)]));
 return sales.filter(sale => (!postId || sale.post_id === postId) &&
  (!line || normalize(saleLine(sale,catalog) || lines.get(sale.post_id) || 'Sin línea') === normalize(canonicalLine(line))));
}
