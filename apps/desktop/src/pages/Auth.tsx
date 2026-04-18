import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { UilArrowLeft, UilSpinner } from "@iconscout/react-unicons";
import { credentialStorage } from "@/services/credentialStorage";
import { deviceFingerprint } from "@/services/deviceFingerprint";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { IS_ELECTRON } from "@/lib/platform";

const TURNSTILE_SITE_KEY = '0x4AAAAAAC-p18A-h6fMkB8R';

// Lazy-load Turnstile script once
function loadTurnstile() {
  if (typeof window === 'undefined' || document.getElementById('cf-turnstile-script')) return;
  const s = document.createElement('script');
  s.id = 'cf-turnstile-script';
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  document.head.appendChild(s);
}

export default function Auth() {
 const navigate = useNavigate();
 const location = useLocation();
 const { isAuthenticated, signIn, signUp } = useAuth();
 // Derive mode from URL path — /auth/signup → signup, everything else → signin
 const isLogin = !location.pathname.includes('signup');
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [rememberMe, setRememberMe] = useState(false);
 const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
 // Reset form when switching between signin/signup routes
 useEffect(() => { setPassword(""); setRememberMe(false); }, [isLogin]);
 const [deviceRecognized, setDeviceRecognized] = useState(false);
 const [showResetPassword, setShowResetPassword] = useState(false);
 const [resetEmail, setResetEmail] = useState("");
 const [resetSent, setResetSent] = useState(false);
 const [resetLoading, setResetLoading] = useState(false);
 const [turnstileToken, setTurnstileToken] = useState<string>('');
 const turnstileRef = React.useRef<HTMLDivElement>(null);

 // Load Turnstile on mount (web only)
 React.useEffect(() => {
   if (IS_ELECTRON) return;
   loadTurnstile();
   // Render widget once script loads
   const interval = setInterval(() => {
     if ((window as any).turnstile && turnstileRef.current && !turnstileRef.current.hasChildNodes()) {
       clearInterval(interval);
       (window as any).turnstile.render(turnstileRef.current, {
         sitekey: TURNSTILE_SITE_KEY,
         callback: (token: string) => setTurnstileToken(token),
         'expired-callback': () => setTurnstileToken(''),
         size: 'invisible',
       });
     }
   }, 300);
   return () => clearInterval(interval);
 }, [IS_ELECTRON]);

 useEffect(() => {
 // Redirect if already authenticated
 if (isAuthenticated) {
 navigate("/dashboard");
 }
 }, [isAuthenticated, navigate]);

 useEffect(() => {
 // Check if device has stored credentials
 checkStoredCredentials();

 // Listen for OAuth callback
 handleOAuthCallback();
 }, []);

 // OAuth callback is handled globally in App.tsx via supabase.auth.onAuthStateChange
 // Nothing to do here — session will be set automatically and isAuthenticated will flip
 const handleOAuthCallback = async () => {};

 const checkStoredCredentials = async () => {
 try {
 const hasCredentials = await credentialStorage.hasCredentials();

 if (hasCredentials) {
 setDeviceRecognized(true);

 // Try to auto-login with stored credentials
 const credentials = await credentialStorage.getCredentials();
 if (credentials) {
 setEmail(credentials.email);
 setRememberMe(true);

 // Show device recognized message
 const deviceInfo = await deviceFingerprint.getDeviceInfo();
 toast.info(`Device recognized! Auto-filling credentials...`, {
 description: `Device ID: ${deviceInfo.deviceId.substring(0, 12)}...`,
 });

 // Attempt auto-login
 setLoading(true);
 try {
 await signIn(credentials.email, credentials.password);
 toast.success('Welcome back! Logged in automatically.');
 } catch (error) {
 console.error('Auto-login failed:', error);
 toast.error('Auto-login failed. Please enter your password.');
 setPassword(""); // Clear password field
 } finally {
 setLoading(false);
 }
 }
 }
 } catch (error) {
 console.error('Error checking stored credentials:', error);
 } finally {
 setIsCheckingCredentials(false);
 }
 };

 // Strict input validation — reject XSS payloads before they reach Supabase
 const sanitizeInput = (value: string): boolean => {
   // Reject any HTML tags, JS protocol, or event handlers (Blind XSS vectors)
   const xssPatterns = [/<[^>]*>/i, /javascript:/i, /on\w+\s*=/i, /script/i, /&lt;|&gt;|&#/i, /\0/];
   return !xssPatterns.some(p => p.test(value));
 };

 const isValidEmail = (e: string): boolean => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254;

 const isStrongPassword = (p: string): { ok: boolean; reason?: string } => {
   if (p.length < 8) return { ok: false, reason: 'Password must be at least 8 characters' };
   if (!/[A-Z]/.test(p)) return { ok: false, reason: 'Password must contain an uppercase letter' };
   if (!/[a-z]/.test(p)) return { ok: false, reason: 'Password must contain a lowercase letter' };
   if (!/[0-9]/.test(p)) return { ok: false, reason: 'Password must contain a number' };
   return { ok: true };
 };

 const handleAuth = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 // Validate inputs — block XSS payloads at the client gate
 if (!isValidEmail(email)) {
   toast.error('Invalid email address');
   setLoading(false);
   return;
 }
 if (!sanitizeInput(email) || !sanitizeInput(password)) {
   toast.error('Invalid characters detected in input');
   setLoading(false);
   return;
 }
 // Enforce password policy on signup
 if (!isLogin) {
   const strength = isStrongPassword(password);
   if (!strength.ok) {
     toast.error(strength.reason);
     setLoading(false);
     return;
   }
 }
 if (!IS_ELECTRON && !turnstileToken) {
   toast.error('Security check required — please wait a moment');
   setLoading(false);
   (window as any).turnstile?.execute?.();
   return;
 }

 try {
 if (isLogin) {
 await signIn(email, password);

 // Store credentials if "Remember Me" is checked
 if (rememberMe) {
 try {
 await credentialStorage.storeCredentials(email, password);
 const deviceInfo = await deviceFingerprint.getDeviceInfo();
 toast.success('Credentials saved for this device', {
 description: `Device ID: ${deviceInfo.deviceId.substring(0, 12)}...`,
 });
 } catch (error) {
 console.error('Failed to store credentials:', error);
 toast.warning('Login successful, but failed to save credentials for next time');
 }
 } else if (deviceRecognized) {
 // User unchecked "Remember Me" - delete stored credentials
 try {
 await credentialStorage.deleteCredentials();
 toast.info('Stored credentials removed from this device');
 } catch (error) {
 console.error('Failed to delete credentials:', error);
 }
 }
 } else {
 await signUp(email, password);
 // Auto-save credentials for new accounts so next login is seamless
 try {
 await credentialStorage.storeCredentials(email, password);
 } catch (error) {
 console.error('Failed to store credentials after signup:', error);
 }
 }
 } catch (error: unknown) {
 // Error handling is done in AuthContext
 console.error('Auth error:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleOAuthLogin = async (provider: 'github' | 'google' | 'azure' | 'gitlab', label: string, scopes?: string) => {
 setLoading(true);
 try {
 const redirectUrl = IS_ELECTRON
   ? 'https://crowbyte.io/auth'
   : `${window.location.origin}/`;

 const { data, error } = await supabase.auth.signInWithOAuth({
 provider,
 options: {
 redirectTo: redirectUrl,
 ...(scopes ? { scopes } : {}),
 skipBrowserRedirect: IS_ELECTRON,
 },
 });

 if (error) throw error;

 if (IS_ELECTRON && data?.url) {
   const result = await window.electronAPI?.openOAuthPopup?.(data.url, redirectUrl);
   if (result?.access_token) {
     const { error: sessionError } = await supabase.auth.setSession({
       access_token: result.access_token,
       refresh_token: result.refresh_token,
     });
     if (sessionError) throw sessionError;
     toast.success(`Signed in with ${label}!`);
     navigate('/dashboard');
   }
   setLoading(false);
 }
 } catch (error: unknown) {
 console.error(`${label} login error:`, error);
 const errorMsg = error instanceof Error ? error.message : `Failed to sign in with ${label}`;
 toast.error(errorMsg);
 setLoading(false);
 }
 };

 const sendPasswordReset = async (email: string): Promise<void> => {
 // Use CrowByte server API (routes through Resend for branded emails)
 const baseUrl = window.location.origin;
 const res = await fetch(`${baseUrl}/api/password-reset`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 email,
 redirect_to: `${window.location.origin}/passwordreset`,
 }),
 });
 if (!res.ok) {
 const data = await res.json().catch(() => ({}));
 throw new Error(data.error || 'Failed to send reset email');
 }
 };

 const handleResetPassword = async () => {
 if (!resetEmail) {
 toast.error('Please enter your email address');
 return;
 }
 setResetLoading(true);
 try {
 await sendPasswordReset(resetEmail);
 setResetSent(true);
 toast.success('Password reset email sent!', {
 description: `Check your inbox at ${resetEmail}`,
 });
 } catch (error: unknown) {
 const msg = error instanceof Error ? error.message : 'Failed to send reset email';
 toast.error(msg);
 } finally {
 setResetLoading(false);
 }
 };

 const handleResendReset = async () => {
 setResetLoading(true);
 try {
 await sendPasswordReset(resetEmail);
 toast.success('Reset email resent!', {
 description: `Check your inbox and spam folder at ${resetEmail}`,
 });
 } catch (error: unknown) {
 const msg = error instanceof Error ? error.message : 'Failed to resend';
 toast.error(msg);
 } finally {
 setResetLoading(false);
 }
 };

 // Show loading spinner while checking for stored credentials
 if (isCheckingCredentials) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#030308] relative overflow-hidden">
 <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: 'url(/auth-bg.png)' }} />
 <div className="relative flex flex-col items-center gap-4">
 <UilSpinner size={48} className="animate-spin text-blue-500" />
 <p className="text-sm text-muted-foreground">Checking device credentials...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-[#030308] p-4 relative overflow-hidden">
 <div className="absolute inset-0 bg-cover bg-center opacity-[0.12]" style={{ backgroundImage: 'url(/auth-bg.png)' }} />
 <div className="relative w-full max-w-lg space-y-6">
 <button
 onClick={() => { window.location.href = '/'; }}
 className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors font-['JetBrains_Mono'] cursor-pointer"
 >
 <UilArrowLeft size={14} />
 Back to website
 </button>
 <div className="flex flex-col items-center gap-3">
 <div className="text-center">
 <p className="text-sm text-zinc-500 font-['JetBrains_Mono'] mb-2">Welcome to</p>
 <h1
 className="text-4xl font-bold text-center font-['JetBrains_Mono'] bg-clip-text text-transparent"
 style={{
 backgroundImage: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 20%, #a78bfa 35%, #c084fc 45%, #f59e0b 60%, #f97316 80%, #ea580c 100%)",
 backgroundSize: "200% 100%",
 animation: "gradient-shift 4s ease-in-out infinite alternate",
 }}
 >
 CrowByte
 </h1>
 </div>
 {deviceRecognized && (
 <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/30 px-3 py-1.5 rounded-full ring-1 ring-blue-500/15">
 <span className="w-2 h-2 rounded-full bg-blue-500" />
 <span>Device Recognized</span>
 </div>
 )}
 </div>
 <Card className="w-full border-blue-500/20 bg-zinc-900/60 shadow-2xl">
 <CardHeader className="text-center pb-6 pt-8 px-8">
 <CardTitle className="text-3xl font-bold">{isLogin ? "Operator Login" : "New Operator"}</CardTitle>
 <CardDescription className="text-sm mt-1.5">
 {isLogin ? "Enter your credentials to access the system" : "Create your CrowByte operator account"}
 </CardDescription>
 </CardHeader>
 <CardContent className="px-8 pb-8">
 <form onSubmit={handleAuth} className="space-y-5">
       {!IS_ELECTRON && <div ref={turnstileRef} className="hidden" />}
 <div className="space-y-2">
 <Label htmlFor="email">Email</Label>
 <Input
 id="email"
 type="email"
 placeholder="your@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 disabled={loading}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="password">Password</Label>
 <Input
 id="password"
 type="password"
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 minLength={8}
 disabled={loading}
 />
 {!isLogin && (
 <p className="text-[11px] text-zinc-500">
 Min 8 characters · uppercase · lowercase · number · symbol
 </p>
 )}
 </div>

 {/* Remember Me + Forgot Password (only show for login) */}
 {isLogin && (
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2" role="group" aria-label="Remember me on this device">
 <Checkbox
 id="remember"
 checked={rememberMe}
 onCheckedChange={(checked) => setRememberMe(checked as boolean)}
 disabled={loading}
 className="h-5 w-5"
 aria-label="Remember me on this device"
 />
 <label
 htmlFor="remember"
 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
 >
 Remember me
 </label>
 </div>
 <button
 type="button"
 onClick={() => { setShowResetPassword(true); setResetEmail(email); setResetSent(false); }}
 className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
 >
 Forgot password?
 </button>
 </div>
 )}

 <Button type="submit" className="w-full" disabled={loading}>
 {loading ? (
 <>
 <UilSpinner size={16} className="mr-2 animate-spin" />
 {isLogin ? "Signing in..." : "Creating account..."}
 </>
 ) : (
 isLogin ? "Login" : "Sign Up"
 )}
 </Button>

 {/* OAuth Divider */}
 <div className="relative">
 <div className="absolute inset-0 flex items-center">
 <Separator />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-card px-2 text-muted-foreground">
 Or continue with
 </span>
 </div>
 </div>

 {/* OAuth Providers */}
 <div className="grid grid-cols-2 gap-3">
 <Button
 type="button"
 variant="outline"
 className="w-full h-11 bg-[#24292e] hover:bg-[#1a1e22] text-white border-[#30363d] hover:border-[#1a1e22] font-medium"
 onClick={() => handleOAuthLogin('github', 'GitHub', 'read:user user:email')}
 disabled={loading}
 >
 <svg className="mr-2 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
 GitHub
 </Button>
 <Button
 type="button"
 variant="outline"
 className="w-full h-11 bg-white hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-gray-400 font-medium"
 onClick={() => handleOAuthLogin('google', 'Google')}
 disabled={loading}
 >
 <svg className="mr-2 shrink-0" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
 Google
 </Button>
 </div>

 <p className="text-center text-sm text-zinc-500">
 {isLogin ? (
 <>Don't have an account?{" "}
 <Link to="/auth/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
 Create one
 </Link></>
 ) : (
 <>Already have an account?{" "}
 <Link to="/auth/signin" className="text-blue-400 hover:text-blue-300 transition-colors">
 Sign in
 </Link></>
 )}
 </p>
 </form>
 </CardContent>
 </Card>
 </div>

 {/* Reset Password Modal */}
 {showResetPassword && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <Card className="w-full max-w-sm border-blue-500/20 bg-card/95">
 <CardHeader className="text-center pb-3">
 <CardTitle className="text-lg">Reset Password</CardTitle>
 <CardDescription>
 {resetSent
 ? "Check your email for a reset link"
 : "Enter your email to receive a password reset link"}
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {!resetSent ? (
 <>
 <div className="space-y-2">
 <Label htmlFor="reset-email">Email</Label>
 <Input
 id="reset-email"
 type="email"
 placeholder="your@email.com"
 value={resetEmail}
 onChange={(e) => setResetEmail(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
 disabled={resetLoading}
 autoFocus
 />
 </div>
 <Button
 onClick={handleResetPassword}
 className="w-full"
 disabled={resetLoading || !resetEmail}
 >
 {resetLoading ? (
 <><UilSpinner size={16} className="mr-2 animate-spin" /> Sending...</>
 ) : (
 "Send Reset Link"
 )}
 </Button>
 </>
 ) : (
 <div className="space-y-4">
 <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 text-center">
 <p className="text-sm text-green-400 font-medium mb-1">Email sent!</p>
 <p className="text-xs text-zinc-400">
 We sent a password reset link to <span className="text-zinc-300">{resetEmail}</span>
 </p>
 <p className="text-[11px] text-zinc-500 mt-2">
 Check your inbox and spam folder. The link expires in 1 hour.
 </p>
 </div>
 <Button
 variant="outline"
 onClick={handleResendReset}
 className="w-full"
 disabled={resetLoading}
 >
 {resetLoading ? (
 <><UilSpinner size={16} className="mr-2 animate-spin" /> Resending...</>
 ) : (
 "Resend Email"
 )}
 </Button>
 </div>
 )}
 <Button
 variant="ghost"
 onClick={() => setShowResetPassword(false)}
 className="w-full text-zinc-500"
 >
 Back to login
 </Button>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 );
}
