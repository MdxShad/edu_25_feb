import { invalidateServerCacheByPrefix } from '@/lib/server-cache';

export function invalidateFinancialCaches() {
  invalidateServerCacheByPrefix('dashboard:');
  invalidateServerCacheByPrefix('report:');
}

