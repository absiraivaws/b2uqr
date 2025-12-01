interface RoleRouteContext {
  companySlug?: string | null;
  branchSlug?: string | null;
  cashierSlug?: string | null;
}

export function getDefaultRouteForRole(role?: string | null, context?: RoleRouteContext) {
  switch (role) {
    case 'company-owner':
      if (context?.companySlug) return `/${context.companySlug}/branches`;
      return '/company/branches';
    case 'branch-manager':
      if (context?.companySlug && context?.branchSlug) {
        return `/${context.companySlug}/${context.branchSlug}`;
      }
      return '/branch';
    case 'cashier':
      if (context?.companySlug && context?.branchSlug && context?.cashierSlug) {
        return `/${context.companySlug}/${context.branchSlug}/${context.cashierSlug}/generate-qr`;
      }
      return '/generate-qr';
    case 'individual':
    default:
      return '/generate-qr';
  }
}

const PERMISSION_RULES: Array<{ prefix: string; permission: string }> = [
  { prefix: '/company', permission: 'company:branches' },
  { prefix: '/branch', permission: 'company:cashiers' },
  { prefix: '/generate-qr', permission: 'generate-qr' },
  { prefix: '/transactions', permission: 'transactions' },
  { prefix: '/summary', permission: 'summary' },
  { prefix: '/profile', permission: 'profile' },
  { prefix: '/settings', permission: 'settings' },
];

const RESERVED_ROOT_SEGMENTS = new Set([
  'generate-qr',
  'transactions',
  'summary',
  'profile',
  'settings',
  'company',
  'branch',
  'signin',
  'signup',
  'reset-pin',
  'api',
  '_next',
  'docs',
  'public',
]);

export function getRequiredPermissionForPath(pathname: string) {
  const rule = PERMISSION_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (rule) return rule.permission;

  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return undefined;

  // company owner slug routes /:companySlug/...  (segments >= 2)
  if (segments.length >= 2) {
    const page = segments[1];
    if (page === 'branches') return 'company:branches';
    if (page === 'profile') return 'profile';
    if (page === 'settings') return 'settings';

    // branch manager area /:companySlug/:branchSlug
    if (segments.length === 2) {
      if (RESERVED_ROOT_SEGMENTS.has(segments[0])) return undefined;
      return 'company:cashiers';
    }

    const third = segments[2];
    if (!third) return undefined;

    // Cashier area /:companySlug/:branchSlug/cashierX/...
    if (third.startsWith('cashier')) {
      const target = segments[3] || 'generate-qr';
      return mapPagePermission(target);
    }

    if (third === 'profile') return 'profile';
    if (third === 'settings') return 'settings';
  }

  return undefined;
}

function mapPagePermission(segment: string) {
  switch (segment) {
    case 'generate-qr':
      return 'generate-qr';
    case 'transactions':
      return 'transactions';
    case 'summary':
      return 'summary';
    case 'profile':
      return 'profile';
    case 'settings':
      return 'settings';
    default:
      return undefined;
  }
}
