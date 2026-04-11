import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UilArrowLeft, UilSpinner, UilLock, UilCheckCircle, UilExclamationCircle } from "@iconscout/react-unicons";
import { toast } from "sonner";

type ResetState = "loading" | "ready" | "submitting" | "success" | "error";

export default function PasswordReset() {
 const navigate = useNavigate();
 const [state, setState] = useState<ResetState>("loading");
 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [errorMsg, setErrorMsg] = useState("");

 useEffect(() => {
 // The URL will have #access_token=...&type=recovery after Supabase verify redirect
 const hash = window.location.hash;
 const hasTokens = hash.includes("access_token=") && hash.includes("type=recovery");

 if (hasTokens) {
 // Parse and set session from hash tokens
 const hashParams = new URLSearchParams(hash.substring(1));
 const accessToken = hashParams.get("access_token");
 const refreshToken = hashParams.get("refresh_token");

 if (accessToken && refreshToken) {
 supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
 .then(({ error }) => {
 if (error) {
 console.error("Failed to set recovery session:", error);
 setErrorMsg("Invalid or expired reset link. Please request a new one.");
 setState("error");
 } else {
 // Clean hash from URL
 window.history.replaceState(null, "", "/passwordreset");
 setState("ready");
 }
 });
 } else {
 setErrorMsg("Invalid reset link. Missing tokens.");
 setState("error");
 }
 } else {
 // Check if already have a session (user navigated here directly)
 supabase.auth.getSession().then(({ data }) => {
 if (data.session) {
 setState("ready");
 } else {
 setErrorMsg("No valid reset session found. Please request a new password reset link.");
 setState("error");
 }
 });
 }
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (password.length < 6) {
 toast.error("Password must be at least 6 characters");
 return;
 }
 if (password !== confirmPassword) {
 toast.error("Passwords do not match");
 return;
 }

 setState("submitting");
 try {
 const { error } = await supabase.auth.updateUser({ password });
 if (error) throw error;

 setState("success");
 toast.success("Password updated successfully!");

 // Redirect to dashboard after 3s
 setTimeout(() => navigate("/dashboard"), 3000);
 } catch (error: unknown) {
 const msg = error instanceof Error ? error.message : "Failed to update password";
 toast.error(msg);
 setState("ready");
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-background p-4">
 <div className="w-full max-w-md space-y-6">
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
 </div>

 <Card className="w-full border-blue-500/20 bg-zinc-900/50">
 <CardHeader className="text-center">
 {state === "loading" && (
 <>
 <div className="mx-auto mb-2">
 <UilSpinner size={40} className="animate-spin text-blue-500" />
 </div>
 <CardTitle className="text-xl">Verifying Reset Link</CardTitle>
 <CardDescription>Please wait while we verify your password reset token...</CardDescription>
 </>
 )}

 {state === "error" && (
 <>
 <div className="mx-auto mb-2">
 <UilExclamationCircle size={40} className="text-red-500" />
 </div>
 <CardTitle className="text-xl text-red-400">Reset Link Invalid</CardTitle>
 <CardDescription className="text-red-400/70">{errorMsg}</CardDescription>
 </>
 )}

 {(state === "ready" || state === "submitting") && (
 <>
 <div className="mx-auto mb-2">
 <UilLock size={40} className="text-blue-500" />
 </div>
 <CardTitle className="text-xl">Set New Password</CardTitle>
 <CardDescription>Enter your new password below</CardDescription>
 </>
 )}

 {state === "success" && (
 <>
 <div className="mx-auto mb-2">
 <UilCheckCircle size={40} className="text-green-500" />
 </div>
 <CardTitle className="text-xl text-green-400">Password Updated!</CardTitle>
 <CardDescription>Your password has been changed successfully. Redirecting to dashboard...</CardDescription>
 </>
 )}
 </CardHeader>

 <CardContent>
 {state === "error" && (
 <div className="space-y-3">
 <Button
 className="w-full"
 onClick={() => navigate("/auth")}
 >
 Back to Login
 </Button>
 </div>
 )}

 {(state === "ready" || state === "submitting") && (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="new-password">New Password</Label>
 <Input
 id="new-password"
 type="password"
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 minLength={6}
 disabled={state === "submitting"}
 autoFocus
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="confirm-password">Confirm Password</Label>
 <Input
 id="confirm-password"
 type="password"
 placeholder="••••••••"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 required
 minLength={6}
 disabled={state === "submitting"}
 />
 </div>

 {password && confirmPassword && password !== confirmPassword && (
 <p className="text-xs text-red-400">Passwords do not match</p>
 )}

 <Button
 type="submit"
 className="w-full"
 disabled={state === "submitting" || !password || !confirmPassword || password !== confirmPassword}
 >
 {state === "submitting" ? (
 <>
 <UilSpinner size={16} className="mr-2 animate-spin" />
 Updating password...
 </>
 ) : (
 "Update Password"
 )}
 </Button>
 </form>
 )}

 {state === "success" && (
 <div className="space-y-3">
 <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 text-center">
 <p className="text-xs text-zinc-400">
 You will be redirected to the dashboard in a few seconds.
 </p>
 </div>
 <Button
 variant="outline"
 className="w-full"
 onClick={() => navigate("/dashboard")}
 >
 Go to Dashboard Now
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
