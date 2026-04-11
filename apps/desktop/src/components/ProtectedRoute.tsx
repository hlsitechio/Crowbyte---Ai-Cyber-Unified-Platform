/**
 * Protected Route Component
 * Redirects to auth page if user is not authenticated.
 * Redirects new web users to preferences wizard (once only).
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent } from '@/components/ui/card';
import { UilShield, UilSync } from "@iconscout/react-unicons";
import { IS_ELECTRON } from '@/lib/platform';
import { getPreferences } from '@/services/subscription';

interface ProtectedRouteProps {
 children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
 const { isAuthenticated, loading } = useAuth();
 const navigate = useNavigate();
 const onboardCheckDone = useRef(false);

 useEffect(() => {
 if (!loading && !isAuthenticated) {
 navigate('/auth');
 return;
 }
 // Redirect to preferences wizard for new web users who haven't completed setup
 if (!loading && isAuthenticated && !IS_ELECTRON) {
 const currentPath = window.location.pathname;
 if (currentPath === '/setup-preferences') return;

 // Fast path: localStorage cache says wizard is done
 const wizardDone = localStorage.getItem('crowbyte_prefs_wizard_done');
 if (wizardDone) return;

 // Slow path: check Supabase for existing preferences (runs once per session)
 if (onboardCheckDone.current) {
   // Already checked this session and no prefs found — redirect
   navigate('/setup-preferences');
   return;
 }
 onboardCheckDone.current = true;

 getPreferences().then((prefs) => {
   if (prefs && prefs.updated_at !== prefs.created_at) {
     // User has saved preferences before — skip wizard, cache locally
     localStorage.setItem('crowbyte_prefs_wizard_done', 'true');
   } else {
     // Fresh user or no prefs — show wizard
     navigate('/setup-preferences');
   }
 }).catch(() => {
   // On error, don't block — skip wizard
   localStorage.setItem('crowbyte_prefs_wizard_done', 'true');
 });
 }
 }, [isAuthenticated, loading, navigate, IS_ELECTRON]);

 // Show loading state while checking auth
 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <Card className="w-full max-w-md">
 <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
 <UilSync size={48} className="text-primary animate-spin" />
 <p className="text-muted-foreground">Checking authentication...</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 // Show nothing (or redirect) if not authenticated
 if (!isAuthenticated) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <Card className="w-full max-w-md">
 <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
 <UilShield size={48} className="text-primary" />
 <p className="text-muted-foreground">Redirecting to login...</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 // User is authenticated, show the protected content
 return <>{children}</>;
}
