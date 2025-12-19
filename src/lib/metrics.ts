let revokedCount = 0;
let cacheHits = 0;
let cacheMisses = 0;

export function incrementRevocationCounter() {
  revokedCount += 1;
}

export function incrementCacheHit() {
  cacheHits += 1;
}

export function incrementCacheMiss() {
  cacheMisses += 1;
}

export function getRevocationMetrics() {
  return { revokedCount, cacheHits, cacheMisses };
}
