let cachedOrigin: string | null = null;

function readEnvOrigin() {
  return (
    process.env.NEXT_PUBLIC_MARKETING_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_MARKETING_ORIGIN ||
    process.env.MARKETING_SITE_ORIGIN ||
    ''
  );
}

function readWindowOrigin() {
  if (typeof window === 'undefined') return '';
  const value = (window as any).__MARKETING_ORIGIN__;
  return typeof value === 'string' ? value : '';
}

export function getMarketingOrigin() {
  if (cachedOrigin !== null) return cachedOrigin;
  const envValue = readEnvOrigin();
  if (envValue) {
    cachedOrigin = envValue;
    return cachedOrigin;
  }
  cachedOrigin = readWindowOrigin();
  return cachedOrigin;
}
