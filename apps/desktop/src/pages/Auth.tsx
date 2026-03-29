import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CircleNotch, GithubLogo } from "@phosphor-icons/react";
import { credentialStorage } from "@/services/credentialStorage";
import { deviceFingerprint } from "@/services/deviceFingerprint";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Auth() {
 const navigate = useNavigate();
 const { isAuthenticated, signIn, signUp } = useAuth();
 const [isLogin, setIsLogin] = useState(true);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [rememberMe, setRememberMe] = useState(false);
 const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
 const [deviceRecognized, setDeviceRecognized] = useState(false);
 const [showResetPassword, setShowResetPassword] = useState(false);
 const [resetEmail, setResetEmail] = useState("");
 const [resetSent, setResetSent] = useState(false);
 const [resetLoading, setResetLoading] = useState(false);

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

 const handleOAuthCallback = async () => {
 // Check if we're returning from OAuth
 const hash = window.location.hash;
 const hasOAuthParams = hash.includes('access_token=');
 console.log('🔍 Checking for OAuth callback:', hasOAuthParams ? 'tokens detected' : 'no tokens');

 // With BrowserRouter, URL is /auth#access_token=...
 const oauthHash = hash.startsWith('#') ? hash.substring(1) : '';

 if (!oauthHash) return;

 const hashParams = new URLSearchParams(oauthHash);
 const accessToken = hashParams.get('access_token');
 const refreshToken = hashParams.get('refresh_token');
 const errorParam = hashParams.get('error');
 const errorDescription = hashParams.get('error_description');

 if (errorParam) {
 console.error('❌ OAuth error:', errorParam, errorDescription);
 toast.error('Authentication failed', {
 description: errorDescription || errorParam,
 });
 return;
 }

 if (accessToken && refreshToken) {
 console.log('✅ OAuth callback detected, setting session manually');
 toast.info('Completing authentication...', {
 description: 'Processing GitHub login',
 });

 try {
 // Manually set the session with extracted tokens
 const { data, error } = await supabase.auth.setSession({
 access_token: accessToken,
 refresh_token: refreshToken,
 });

 if (error) throw error;

 console.log('✅ OAuth session established');
 toast.success('Logged in successfully!');

 // Clean the hash and navigate to dashboard
 window.history.replaceState(null, '', '/auth');
 navigate('/dashboard');
 } catch (err) {
 console.error('❌ Failed to set session:', err);
 toast.error('Authentication failed', {
 description: err instanceof Error ? err.message : 'Failed to process OAuth tokens',
 });
 }
 }
 };

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

 const handleAuth = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

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
 }
 } catch (error: unknown) {
 // Error handling is done in AuthContext
 console.error('Auth error:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleGitHubLogin = async () => {
 setLoading(true);
 try {
 // Use current origin for redirect — works in both Electron and browser
 const redirectUrl = `${window.location.origin}/auth`;

 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'github',
 options: {
 redirectTo: redirectUrl,
 scopes: 'read:user user:email',
 },
 });

 if (error) throw error;

 console.log('GitHub OAuth initiated, redirecting to GitHub...');
 toast.info('Opening GitHub authorization...', {
 description: 'You will be redirected back after authorization',
 });
 } catch (error: unknown) {
 console.error('GitHub login error:', error);
 const errorMsg = error instanceof Error ? error.message : 'Failed to sign in with GitHub';
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
 <div className="min-h-screen flex items-center justify-center bg-background">
 <div className="flex flex-col items-center gap-4">
 <CircleNotch size={48} weight="bold" className="animate-spin text-blue-500" />
 <p className="text-sm text-muted-foreground">Checking device credentials...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-background p-4">
 <div className="w-full max-w-md space-y-6">
 <button
 onClick={() => { window.location.href = '/'; }}
 className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors font-['JetBrains_Mono'] cursor-pointer"
 >
 <ArrowLeft size={14} weight="bold" />
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
 <Card className="w-full border-blue-500/20 bg-zinc-950/50">
 <CardHeader className="text-center">
 <CardTitle className="text-2xl">{isLogin ? "Operator Login" : "New Operator Registration"}</CardTitle>
 <CardDescription>
 {isLogin ? "Enter your credentials to access the system" : "Create your CrowByte operator account"}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleAuth} className="space-y-4">
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
 minLength={6}
 disabled={loading}
 />
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
 <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
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

 {/* GitHub OAuth Button */}
 <Button
 type="button"
 variant="outline"
 className="w-full bg-[#24292e] hover:bg-[#1a1e22] text-white border-[#24292e] hover:border-[#1a1e22]"
 onClick={handleGitHubLogin}
 disabled={loading}
 >
 <GithubLogo size={20} weight="duotone" className="mr-2" />
 Continue with GitHub
 </Button>

 <Button
 type="button"
 variant="ghost"
 className="w-full"
 onClick={() => {
 setIsLogin(!isLogin);
 setRememberMe(false); // Reset remember me when switching modes
 }}
 disabled={loading}
 >
 {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
 </Button>
 </form>
 </CardContent>
 </Card>
 </div>

 {/* Reset Password Modal */}
 {showResetPassword && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <Card className="w-full max-w-sm border-blue-500/20 bg-zinc-950/95">
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
 <><CircleNotch size={16} weight="bold" className="mr-2 animate-spin" /> Sending...</>
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
 <><CircleNotch size={16} weight="bold" className="mr-2 animate-spin" /> Resending...</>
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
