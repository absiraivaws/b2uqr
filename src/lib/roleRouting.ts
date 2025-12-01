export function getDefaultRouteForRole(role?: string | null) {
  switch (role) {
    case 'company-owner':
      return '/company/branches';
    case 'branch-manager':
      return '/branch';
    case 'cashier':
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

export function getRequiredPermissionForPath(pathname: string) {
  const rule = PERMISSION_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return rule?.permission;
}
