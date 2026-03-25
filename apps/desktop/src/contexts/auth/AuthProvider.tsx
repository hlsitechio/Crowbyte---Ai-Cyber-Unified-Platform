/**
 * Authentication Provider
 * Provides global auth state and functions
 */

import { createContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { loggingService } from '@/services/logging';
import { toast } from 'sonner';
import { AuthContextType } from './types';
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Auth state changes logged to system logs only, not console
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle auth events - log to system logs
        if (event === 'SIGNED_IN') {
          loggingService.addLog('success', 'auth', 'User signed in successfully', `User: ${session?.user?.email}`);

        } else if (event === 'SIGNED_OUT') {
          loggingService.addLog('info', 'auth', 'User signed out');
          navigate('/auth');
        } else if (event === 'USER_UPDATED') {
          loggingService.addLog('info', 'auth', 'User profile updated');

        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        const errorMsg = 'This email is already registered. Please sign in instead.';
        loggingService.addLog('warning', 'auth', 'Sign up failed - email already exists', `Email: ${email}`);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      loggingService.addLog('success', 'auth', 'Account created successfully', `Email: ${email}`);
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create account';
      loggingService.addLog('error', 'auth', 'Sign up failed', errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      loggingService.addLog('success', 'auth', 'User login successful', `Email: ${email}`);
      // Navigate to dashboard on success
      navigate('/');
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to sign in';
      loggingService.addLog('error', 'auth', 'Login failed', errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      loggingService.addLog('info', 'auth', 'User logout initiated');
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to sign out';
      loggingService.addLog('error', 'auth', 'Logout failed', errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
