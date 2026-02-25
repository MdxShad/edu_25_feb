export type RbacRole = 'SUPER_ADMIN' | 'STAFF' | 'CONSULTANT' | 'AGENT';

export type RbacUser = {
  role: RbacRole;
  permissions: unknown | null;
};

export function hasStaffPermission(user: RbacUser, permission: string): boolean {
  if (user.role !== 'STAFF') return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function canAccessAdmissions(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    user.role === 'AGENT' ||
    hasStaffPermission(user, 'admissionView')
  );
}

export function canCreateAdmissions(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    hasStaffPermission(user, 'admissionAdd')
  );
}

export function canAccessAccounts(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    hasStaffPermission(user, 'accountsView')
  );
}

export function canAccessExpenses(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    hasStaffPermission(user, 'expenseAdd')
  );
}

export function canAccessReports(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    user.role === 'AGENT' ||
    hasStaffPermission(user, 'reportsView')
  );
}

export function canAccessPosters(user: RbacUser): boolean {
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'CONSULTANT' ||
    user.role === 'AGENT' ||
    hasStaffPermission(user, 'reportsView')
  );
}

export function isRouteAllowed(pathname: string, user: RbacUser): boolean {
  if (pathname.startsWith('/app/admin')) return user.role === 'SUPER_ADMIN';
  if (pathname.startsWith('/app/agents/me')) return user.role === 'AGENT';
  if (pathname.startsWith('/app/agents'))
    return user.role === 'SUPER_ADMIN' || user.role === 'CONSULTANT';

  if (pathname.startsWith('/app/admissions/new')) return canCreateAdmissions(user);
  if (pathname.startsWith('/app/admissions')) return canAccessAdmissions(user);

  if (pathname.startsWith('/app/ledgers/university')) return canAccessAccounts(user);
  if (pathname.startsWith('/app/ledgers/profit')) return canAccessAccounts(user);
  if (pathname.startsWith('/app/ledgers/agent'))
    return user.role === 'AGENT' || canAccessAccounts(user);

  if (pathname.startsWith('/app/expenses')) return canAccessExpenses(user);
  if (pathname.startsWith('/app/reports')) return canAccessReports(user);
  if (pathname.startsWith('/app/posters')) return canAccessPosters(user);
  if (pathname.startsWith('/app/ai')) return canAccessReports(user);

  return true;
}
