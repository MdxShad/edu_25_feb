import { Role } from '@prisma/client';

export type StaffPermission =
  | 'admissionView'
  | 'admissionAdd'
  | 'admissionEdit'
  | 'accountsView'
  | 'expenseAdd'
  | 'reportsView'
  | 'leadsView'
  | 'leadsManage'
  | 'paymentsAdd'
  | 'paymentsApprove'
  | 'postersManage'
  | 'userManage';

export const ALL_STAFF_PERMISSIONS: { key: StaffPermission; label: string; description: string }[] =
  [
    {
      key: 'admissionView',
      label: 'Admission view',
      description: 'Can view admissions list and details.',
    },
    {
      key: 'admissionAdd',
      label: 'Add admission',
      description: 'Can create new admissions.',
    },
    {
      key: 'admissionEdit',
      label: 'Edit admission',
      description: 'Can edit admissions (if enabled in future milestones).',
    },
    {
      key: 'accountsView',
      label: 'Accounts view',
      description: 'Can view ledgers and financial pages.',
    },
    {
      key: 'expenseAdd',
      label: 'Expense add',
      description: 'Can add daily expenses.',
    },
    {
      key: 'reportsView',
      label: 'Reports',
      description: 'Can view reports.',
    },
    {
      key: 'leadsView',
      label: 'Leads view',
      description: 'Can view leads inbox.',
    },
    {
      key: 'leadsManage',
      label: 'Leads manage',
      description: 'Can update lead status/assignment/notes.',
    },
    {
      key: 'paymentsAdd',
      label: 'Payments add',
      description: 'Can add ledger and student payments.',
    },
    {
      key: 'paymentsApprove',
      label: 'Payments approve',
      description: 'Can approve finalized payment workflows.',
    },
    {
      key: 'postersManage',
      label: 'Posters manage',
      description: 'Can manage poster lifecycle.',
    },
    {
      key: 'userManage',
      label: 'User management',
      description: 'Can manage users (staff/agents) if allowed.',
    },
  ];

export function isAdminRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

export function isConsultantRole(role: Role): boolean {
  return role === Role.CONSULTANT;
}

export function isAgentRole(role: Role): boolean {
  return role === Role.AGENT;
}

export function isStaffRole(role: Role): boolean {
  return role === Role.STAFF;
}

export function hasStaffPermission(
  user: { role: Role; permissions: unknown | null },
  perm: StaffPermission
): boolean {
  if (user.role !== Role.STAFF) return false;
  if (!user.permissions) return false;
  if (!Array.isArray(user.permissions)) return false;
  return (user.permissions as unknown[]).includes(perm);
}

export function canAccess(
  user: { role: Role; permissions: unknown | null },
  perm: StaffPermission
): boolean {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) {
    // Consultant has broad access to their own operations.
    // Keep this conservative; routes still enforce scope.
    return true;
  }
  if (user.role === Role.AGENT) {
    // Agent is view-only per spec.
    return perm === 'admissionView' || perm === 'reportsView';
  }
  return hasStaffPermission(user, perm);
}
