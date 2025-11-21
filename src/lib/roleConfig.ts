export type RoleKey = 'admin' | 'staff';

export const ROLE_CONFIG: Record<RoleKey, {
  usersCollection: string;
  invitesCollection: string;
  sessionsCollection: string;
  sessionCookieName: string;
  setPasswordPath: string;
  signinPath: string;
}> = {
  admin: {
    usersCollection: 'admins',
    invitesCollection: 'admin_invites',
    sessionsCollection: 'admin_sessions',
    sessionCookieName: 'admin_session',
    setPasswordPath: '/admin/set-password',
    signinPath: '/admin/signin',
  },
  staff: {
    usersCollection: 'staff',
    invitesCollection: 'staff_invites',
    sessionsCollection: 'staff_sessions',
    sessionCookieName: 'staff_session',
    setPasswordPath: '/staff/set-password',
    signinPath: '/staff/signin',
  }
};

export function isValidRole(r: string | undefined): r is RoleKey {
  return r === 'admin' || r === 'staff';
}
