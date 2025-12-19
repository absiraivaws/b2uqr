type HeaderMap = Record<string, string>;

const FALLBACK_ORIGINS = ['https://www.b2u.app'];

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

function parseOrigins(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
}

const configuredOrigins = [
  ...parseOrigins(process.env.NEXT_PUBLIC_MARKETING_SITE_ORIGIN ? String(process.env.NEXT_PUBLIC_MARKETING_SITE_ORIGIN) : undefined),
].filter((origin, index, list) => list.indexOf(origin) === index);

const allowedOrigins = configuredOrigins.length ? configuredOrigins : FALLBACK_ORIGINS;

export function buildCorsHeaders(origin: string | null): HeaderMap {
  const normalized = origin ? normalizeOrigin(origin) : null;
  if (!origin) return {};
  if (allowedOrigins.includes('*') || (normalized && allowedOrigins.includes(normalized))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    };
  }
  return {};
}

export function buildPreflightHeaders(req: Request, methods: string[] = ['POST', 'OPTIONS']): HeaderMap {
  const origin = req.headers.get('origin');
  return {
    ...buildCorsHeaders(origin),
    'Access-Control-Allow-Methods': methods.join(','),
    'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || 'Content-Type',
  };
}
