import type { Permission, Role } from './types';

export const ALL_PERMISSIONS: ReadonlyArray<{
  key: Permission;
  label: string;
  description: string;
}> = [
  { key: 'dataset:read', label: 'Read Datasets', description: 'View interactive charts, tables, and filters' },
  { key: 'dataset:write', label: 'Edit Records', description: 'Create and update dataset records' },
  { key: 'dataset:delete', label: 'Delete Records', description: 'Permanently remove dataset entries' },
  { key: 'dataset:export', label: 'Export Data', description: 'Download filtered CSV and JSON snapshots' },
  { key: 'story:edit', label: 'Edit Narrative', description: 'Update scrollytelling editorial copy' },
  { key: 'sync:push', label: 'Push KV Sync', description: 'Upload encrypted vault blobs to edge KV' },
  { key: 'sync:configure', label: 'Configure Edge KV', description: 'Change Cloudflare Worker endpoint and passphrase' },
  { key: 'users:manage', label: 'Manage Roles', description: 'Assign Admin, Editor, or Viewer roles' },
  { key: 'activity:audit', label: 'Audit Activity', description: 'Inspect and export full security audit logs' },
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    'dataset:read',
    'dataset:write',
    'dataset:delete',
    'dataset:export',
    'story:edit',
    'sync:push',
    'sync:configure',
    'users:manage',
    'activity:audit',
  ]),
  editor: new Set<Permission>([
    'dataset:read',
    'dataset:write',
    'dataset:export',
    'story:edit',
    'sync:push',
  ]),
  viewer: new Set<Permission>(['dataset:read']),
};

export const ROLE_META: Record<Role, { label: string; summary: string }> = {
  admin: {
    label: 'Admin',
    summary: 'Full governance over datasets, encryption keys, Cloudflare KV endpoints, and team roles.',
  },
  editor: {
    label: 'Editor',
    summary: 'Can create and update records, refine editorial stories, export CSV/JSON, and push encrypted syncs.',
  },
  viewer: {
    label: 'Viewer',
    summary: 'Read-only analytical access to charts, filters, scrollytelling essays, and paginated data tables.',
  },
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function getPermissionsForRole(role: Role): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

export function assertPermission(role: Role | null | undefined, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const activeRole = role ? ROLE_META[role].label : 'Unauthenticated';
    throw new Error(`Access denied: "${activeRole}" role lacks "${permission}" permission.`);
  }
}

export function validateCredentials(email: string, password: string, name?: string): string | null {
  const trimmedEmail = email.trim();
  if (name !== undefined && name.trim().length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return 'Please enter a valid email address.';
  }
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  return null;
}
