/**
 * AdminRoute — redirects non-admin users to /dashboard on web.
 * On desktop (Electron) all pages are accessible — admin gate is web-only.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { isAdmin } from '@/lib/admin';
import { IS_WEB } from '@/lib/platform';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Desktop = full access, Web = admin-gated
  if (IS_WEB && !isAdmin(user?.id)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
