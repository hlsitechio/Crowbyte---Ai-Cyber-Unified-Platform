/**
 * Admin gate — hide internal/infra pages from non-admin users.
 * Single source of truth for admin user ID.
 */

const ADMIN_USER_ID = '348309de-1cb4-4fd5-9f55-fa8a749375a5';

export function isAdmin(userId: string | undefined | null): boolean {
  return !!userId && userId === ADMIN_USER_ID;
}
