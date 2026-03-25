/**
 * Protected Route Component
 * Redirects to auth page if user is not authenticated
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ArrowsClockwise } from '@phosphor-icons/react';

interface ProtectedRouteProps {
 children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
 const { isAuthenticated, loading } = useAuth();
 const navigate = useNavigate();

 useEffect(() => {
 if (!loading && !isAuthenticated) {
 navigate('/auth');
 }
 }, [isAuthenticated, loading, navigate]);

 // Show loading state while checking auth
 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <Card className="w-full max-w-md">
 <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
 <ArrowsClockwise size={48} weight="duotone" className="text-primary animate-spin" />
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
 <Shield size={48} weight="duotone" className="text-primary" />
 <p className="text-muted-foreground">Redirecting to login...</p>
 </CardContent>
 </Card>
 </div>
 );
 }

 // User is authenticated, show the protected content
 return <>{children}</>;
}
