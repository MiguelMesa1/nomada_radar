import 'server-only';
import {unstable_cache} from 'next/cache';
import {loadMetaAds} from '@/lib/meta-ads';
export const cachedMetaAds=unstable_cache(loadMetaAds,['radar-meta-ads-costs-v2'],{revalidate:900});
