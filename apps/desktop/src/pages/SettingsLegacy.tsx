import { useState, useEffect } from"react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Label } from"@/components/ui/label";
import { Input } from"@/components/ui/input";
import { Button } from"@/components/ui/button";
import { Switch } from"@/components/ui/switch";
import { Separator } from"@/components/ui/separator";
import { Progress } from"@/components/ui/progress";
import { RssSimple, CheckCircle, XCircle, Brain, ArrowsClockwise, TrendUp, Lightning, Pulse, TreeStructure, SignOut, X, Trash, Wrench, Database, User as UserIcon, FloppyDisk, Envelope, Calendar, Shield as ShieldIcon, Eye, EyeSlash, Key } from "@phosphor-icons/react";
import inoreaderService from"@/services/inoreader";
import openClaw from"@/services/openclaw";
import { healthMonitor } from"@/services/supabase-health";
import { supabase } from"@/lib/supabase";
import { useToast } from"@/hooks/use-toast";
import { useAuth } from"@/contexts/auth";
import { useLogs } from"@/contexts/logs";
import { cacheService, type CacheStats } from"@/services/cache";
import MCP from"./MCP";
import Tools from"./Tools";
import Memory from"./Memory";
import AgentTesting from"./AgentTesting";

const Settings = () => {
 const { toast } = useToast();
 const { signOut, user } = useAuth();
 const { clearLogs, logs } = useLogs();
 const [inoreaderAuth, setInoreaderAuth] = useState(false);
 const [apiUsage, setApiUsage] = useState({
 count: 0,
 limit: 5000,
 remaining: 5000,
 resetTime: new Date(),
 percentUsed: 0,
 });
 // LLM Models state
 const [models, setModels] = useState<any[]>([]);
 const [loadingModels, setLoadingModels] = useState(true);
 const [openClawConnected, setOpenClawConnected] = useState(false);
 const [openClawEndpoint, setOpenClawEndpoint] = useState(localStorage.getItem('openclaw_endpoint') || `https://${import.meta.env.VITE_OPENCLAW_HOSTNAME || 'localhost'}`);
 const [showApiKey, setShowApiKey] = useState(false);
 const [testingConnection, setTestingConnection] = useState(false);

 // General Settings State
 const [workspaceName, setWorkspaceName] = useState(localStorage.getItem('workspace_name') || 'CyberOps HQ');
 const [enableNotifications, setEnableNotifications] = useState(localStorage.getItem('enable_notifications') === 'true' || true);

 // Security Settings State
 const [twoFactorAuth, setTwoFactorAuth] = useState(localStorage.getItem('two_factor_auth') === 'true' || false);
 const [encryptedStorage, setEncryptedStorage] = useState(localStorage.getItem('encrypted_storage') === 'true' || true);
 const [auditLogging, setAuditLogging] = useState(localStorage.getItem('audit_logging') === 'true' || true);

 // Advanced Settings State
 const [debugMode, setDebugMode] = useState(localStorage.getItem('debug_mode') === 'true' || false);
 const [experimentalFeatures, setExperimentalFeatures] = useState(localStorage.getItem('experimental_features') === 'true' || false);
 const [maxConcurrentOps, setMaxConcurrentOps] = useState(parseInt(localStorage.getItem('max_concurrent_ops') || '10'));

 // Integrations State
 const [ollamaApiKey, setOllamaApiKey] = useState(localStorage.getItem('ollama_api_key') || '');
 const [ollamaEndpoint, setOllamaEndpoint] = useState(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434');

 // Cache Management State
 const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
 const [cacheSize, setCacheSize] = useState(0);
 const [loadingCache, setLoadingCache] = useState(false);
 const [clearingCache, setClearingCache] = useState(false);

 // Profile Picture State
 const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
 const [uploadingPicture, setUploadingPicture] = useState(false);

 // Check Inoreader authentication status and load settings
 useEffect(() => {
 setInoreaderAuth(inoreaderService.isAuthenticated());
 if (inoreaderService.isAuthenticated()) {
 setApiUsage(inoreaderService.getAPIUsage());
 }
 // Fetch LLM models
 fetchModels();
 // Check OpenClaw health
 checkOpenClaw();
 // Load app settings from Electron
 loadAppSettings();
 // Load cache statistics
 loadCacheStats();
 // Load profile picture
 loadProfilePicture();
 }, []);

 const loadAppSettings = async () => {
 if (window.electronAPI?.getAppSettings) {
 const result = await window.electronAPI.getAppSettings();
 if (result.success && result.settings) {
 }
 }
 };

 // OpenClaw endpoint loaded from localStorage in state init

 const loadProfilePicture = async () => {
 if (!user) return;

 try {
 const { data, error } = await supabase
 .from('user_settings')
 .select('profile_picture_url')
 .eq('user_id', user.id)
 .single();

 if (error && error.code !== 'PGRST116') {
 console.error('Error loading profile picture:', error);
 return;
 }

 if (data?.profile_picture_url) {
 setProfilePictureUrl(data.profile_picture_url);
 }
 } catch (error) {
 console.error('Failed to load profile picture:', error);
 }
 };

 const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file || !user) return;

 // Validate file type
 const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
 if (!validTypes.includes(file.type)) {
 toast({
 title:"Invalid File Type",
 description:"Please upload a JPEG, PNG, GIF, or WebP image",
 variant:"destructive",
 });
 return;
 }

 // Validate file size (5MB)
 if (file.size > 5 * 1024 * 1024) {
 toast({
 title:"File Too Large",
 description:"Please upload an image smaller than 5MB",
 variant:"destructive",
 });
 return;
 }

 setUploadingPicture(true);

 try {
 // Delete old profile picture if exists
 if (profilePictureUrl) {
 const oldPath = profilePictureUrl.split('/').pop();
 if (oldPath) {
 await supabase.storage
 .from('profile-pictures')
 .remove([`${user.id}/${oldPath}`]);
 }
 }

 // Upload new profile picture
 const fileExt = file.name.split('.').pop();
 const fileName = `${user.id}/profile.${fileExt}`;
 const { data, error } = await supabase.storage
 .from('profile-pictures')
 .upload(fileName, file, { upsert: true });

 if (error) throw error;

 // Get public URL
 const { data: { publicUrl } } = supabase.storage
 .from('profile-pictures')
 .getPublicUrl(fileName);

 // Update user_settings table
 await supabase
 .from('user_settings')
 .upsert({
 user_id: user.id,
 profile_picture_url: publicUrl,
 updated_at: new Date().toISOString(),
 });

 setProfilePictureUrl(publicUrl);

 // Dispatch event to update sidebar
 window.dispatchEvent(new Event('profilePictureChanged'));

 toast({
 title:"Profile Picture Updated",
 description:"Your profile picture has been uploaded successfully",
 });
 } catch (error) {
 console.error('Failed to upload profile picture:', error);
 toast({
 title:"Upload Failed",
 description: error instanceof Error ? error.message :"Failed to upload profile picture",
 variant:"destructive",
 });
 } finally {
 setUploadingPicture(false);
 }
 };

 const checkOpenClaw = async () => {
 try {
 const health = await openClaw.healthCheck();
 setOpenClawConnected(health.ok);
 } catch {
 setOpenClawConnected(false);
 }
 };

 const saveOpenClawEndpoint = async () => {
 localStorage.setItem('openclaw_endpoint', openClawEndpoint);
 toast({
 title:"Endpoint Saved",
 description:"OpenClaw VPS endpoint has been saved",
 });
 checkOpenClaw();
 };

 const testOpenClawConnection = async () => {
 setTestingConnection(true);
 try {
 const health = await openClaw.healthCheck();
 setOpenClawConnected(health.ok);
 toast({
 title: health.ok ?"Connection Successful" :"Connection Failed",
 description: health.ok ?"OpenClaw VPS is online and responding" :"VPS is not responding",
 variant: health.ok ?"default" :"destructive",
 });
 } catch (error) {
 console.error('Connection test failed:', error);
 setOpenClawConnected(false);
 toast({
 title:"Connection Failed",
 description:"OpenClaw VPS is unreachable",
 variant:"destructive",
 });
 } finally {
 setTestingConnection(false);
 }
 };

 const fetchModels = async () => {
 setLoadingModels(true);
 try {
 const data = openClaw.getModels();
 setModels(data);
 } catch (error) {
 console.error('Failed to fetch models:', error);
 } finally {
 setLoadingModels(false);
 }
 };

 // Handle Inoreader authentication
 const handleInoreaderAuth = () => {
 const authUrl = inoreaderService.getAuthUrl();
 window.open(authUrl, '_blank');

 toast({
 title:"Authentication Required",
 description:"Complete OAuth authentication in the opened window, then refresh this page.",
 });
 };

 // Handle Inoreader logout
 const handleInoreaderLogout = () => {
 inoreaderService.logout();
 setInoreaderAuth(false);
 setApiUsage({
 count: 0,
 limit: 5000,
 remaining: 5000,
 resetTime: new Date(),
 percentUsed: 0,
 });

 toast({
 title:"Disconnected",
 description:"Inoreader account disconnected successfully.",
 });
 };

 const handleLogout = async () => {
 try {
 await signOut();
 toast({
 title:"Logged out successfully",
 description:"You have been logged out of your account.",
 });
 } catch (error) {
 console.error('Logout error:', error);
 toast({
 title:"Logout failed",
 description:"An error occurred while logging out.",
 variant:"destructive",
 });
 }
 };

 const handleExitApp = async () => {
 if (window.electronAPI?.quitApp) {
 await window.electronAPI.quitApp();
 } else {
 toast({
 title:"Exit not available",
 description:"Exit app is only available in Electron desktop mode.",
 variant:"destructive",
 });
 }
 };

 const handleClearLogs = () => {
 clearLogs();
 toast({
 title:"Logs cleared",
 description:"All system logs have been permanently deleted.",
 });
 };

 // Save Handlers
 const handleSaveGeneral = async () => {
 localStorage.setItem('workspace_name', workspaceName);
 localStorage.setItem('enable_notifications', String(enableNotifications));

 // Dispatch custom event to notify sidebar of workspace name change
 window.dispatchEvent(new Event('workspaceNameChanged'));

 // Save settings to Electron
 if (window.electronAPI?.saveAppSettings) {
 await window.electronAPI.saveAppSettings({
 showIntroAnimation: false,
 rememberMe: false,
 });
 }

 toast({
 title:"Settings Saved",
 description:"General settings have been updated successfully.",
 });
 };

 const handleSaveSecurity = () => {
 localStorage.setItem('two_factor_auth', String(twoFactorAuth));
 localStorage.setItem('encrypted_storage', String(encryptedStorage));
 localStorage.setItem('audit_logging', String(auditLogging));
 toast({
 title:"Security Settings Saved",
 description:"Security preferences have been updated successfully.",
 });
 };

 const handleSaveAdvanced = () => {
 localStorage.setItem('debug_mode', String(debugMode));
 localStorage.setItem('experimental_features', String(experimentalFeatures));
 localStorage.setItem('max_concurrent_ops', String(maxConcurrentOps));
 toast({
 title:"Advanced Settings Saved",
 description:"Advanced preferences have been updated successfully.",
 });
 };

 const handleSaveIntegrations = () => {
 localStorage.setItem('ollama_api_key', ollamaApiKey);
 localStorage.setItem('ollama_endpoint', ollamaEndpoint);
 toast({
 title:"Ollama Settings Saved",
 description:"Ollama configuration has been updated successfully.",
 });
 };

 // Cache Management Functions
 const loadCacheStats = async () => {
 setLoadingCache(true);
 try {
 const stats = await cacheService.getStats(true); // User-specific stats
 const totalSize = await cacheService.getTotalSize(true);
 setCacheStats(stats);
 setCacheSize(totalSize);
 } catch (error) {
 console.error('Failed to load cache stats:', error);
 toast({
 title:"Error",
 description:"Failed to load cache statistics",
 variant:"destructive",
 });
 } finally {
 setLoadingCache(false);
 }
 };

 const handleClearCache = async () => {
 setClearingCache(true);
 try {
 // Clear all cache types
 const results = await Promise.all([
 cacheService.clearByType('conversation', { userSpecific: true }),
 cacheService.clearByType('api_response', { userSpecific: true }),
 cacheService.clearByType('search', { userSpecific: true }),
 cacheService.clearByType('embedding', { userSpecific: true }),
 cacheService.clearByType('tool_result', { userSpecific: true }),
 ]);

 const success = results.every(r => r);

 if (success) {
 toast({
 title:"Cache Cleared",
 description:"All cache data has been cleared successfully",
 });
 // Reload stats
 await loadCacheStats();
 } else {
 throw new Error('Some cache types failed to clear');
 }
 } catch (error) {
 console.error('Failed to clear cache:', error);
 toast({
 title:"Error",
 description:"Failed to clear cache data",
 variant:"destructive",
 });
 } finally {
 setClearingCache(false);
 }
 };

 const handleCleanupCache = async () => {
 try {
 const cleaned = await cacheService.cleanupExpired();
 toast({
 title:"Cache Cleanup Complete",
 description: `Removed ${cleaned} expired cache entries`,
 });
 // Reload stats
 await loadCacheStats();
 } catch (error) {
 console.error('Failed to cleanup cache:', error);
 toast({
 title:"Error",
 description:"Failed to cleanup expired cache",
 variant:"destructive",
 });
 }
 };

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-3xl font-bold text-white">Settings</h1>
 <p className="text-muted-foreground terminal-text mt-2">
 Configure your cyber operations environment
 </p>
 </div>

 <Tabs defaultValue="profile" className="space-y-4">
 <TabsList className="bg-card ">
 <TabsTrigger value="profile">Profile</TabsTrigger>
 <TabsTrigger value="general">General</TabsTrigger>
 <TabsTrigger value="llm">LLM Models</TabsTrigger>
 <TabsTrigger value="mcp">MCP Connectors</TabsTrigger>
 <TabsTrigger value="tools">AI Tools</TabsTrigger>
 <TabsTrigger value="memory">Memory</TabsTrigger>
 <TabsTrigger value="testing">Agent Testing</TabsTrigger>
 <TabsTrigger value="security">Security</TabsTrigger>
 <TabsTrigger value="integrations">Integrations</TabsTrigger>
 <TabsTrigger value="advanced">Advanced</TabsTrigger>
 </TabsList>

 {/* Profile Tab */}
 <TabsContent value="profile" className="space-y-4">
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <UserIcon size={20} weight="duotone" className="text-primary" />
 User Profile
 </CardTitle>
 <CardDescription>Your account information and preferences</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* User Info Display */}
 <div className="flex items-center gap-4 p-4 bg-transparent rounded-lg">
 <div className="relative group">
 <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white/[0.05] overflow-hidden">
 {profilePictureUrl ? (
 <img
 src={profilePictureUrl}
 alt="Profile"
 className="h-full w-full object-cover"
 />
 ) : (
 <UserIcon size={32} weight="duotone" className="text-primary" />
 )}
 </div>
 <label
 htmlFor="profile-picture-upload"
 className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
 >
 {uploadingPicture ? (
 <ArrowsClockwise size={20} weight="duotone" className="text-white animate-spin" />
 ) : (
 <span className="text-xs text-white font-semibold">Upload</span>
 )}
 </label>
 <input
 id="profile-picture-upload"
 type="file"
 accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
 className="hidden"
 onChange={handleProfilePictureUpload}
 disabled={uploadingPicture}
 />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-white">
 {user?.user_metadata?.full_name || 'CrowByte Operator'}
 </h3>
 <div className="flex items-center gap-2 mt-1">
 <Envelope size={16} weight="bold" className="text-muted-foreground" />
 <p className="text-sm text-muted-foreground">{user?.email}</p>
 </div>
 <div className="flex items-center gap-2 mt-1">
 <Calendar size={16} weight="bold" className="text-muted-foreground" />
 <p className="text-xs text-muted-foreground">
 Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
 </p>
 </div>
 </div>
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500 font-medium">Active</span>
 </span>
 </div>

 {/* Account Details — inline row, no cards */}
 <div className="flex items-center gap-6 py-3 border-t border-white/[0.04]">
 <div className="flex items-center gap-2 text-xs">
 <span className="text-zinc-500">Sessions</span>
 <span className="text-white font-medium">{user?.id ? '1' : '0'}</span>
 </div>
 <div className="flex items-center gap-2 text-xs">
 <span className="text-zinc-500">Email</span>
 <span className={user?.email_confirmed_at ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
 {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
 </span>
 </div>
 <div className="flex items-center gap-2 text-xs">
 <span className="text-zinc-500">Role</span>
 <span className="text-white font-medium">Operator</span>
 </div>
 </div>

 {/* Account Actions — ghost buttons, no borders */}
 <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
 <button
 onClick={handleLogout}
 className="text-xs text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1.5"
 >
 <SignOut size={14} weight="bold" />
 Logout
 </button>
 <button
 onClick={handleExitApp}
 className="text-xs text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
 >
 <X size={14} weight="bold" />
 Exit
 </button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="general" className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>General Settings</CardTitle>
 <CardDescription>Manage your workspace preferences</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="workspace">Workspace Name</Label>
 <Input
 id="workspace"
 value={workspaceName}
 onChange={(e) => setWorkspaceName(e.target.value)}
 className="terminal-text"
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Enable Notifications</Label>
 <p className="text-sm text-muted-foreground">Receive alerts for system events</p>
 </div>
 <Switch
 checked={enableNotifications}
 onCheckedChange={setEnableNotifications}
 />
 </div>
 <Separator />
 <div className="flex justify-end">
 <Button
 onClick={handleSaveGeneral}
 size="sm"
 >
 <FloppyDisk size={14} weight="bold" className="mr-1.5" />
 Save
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="llm" className="space-y-4">
 {/* OpenClaw VPS Configuration Card */}
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TreeStructure size={20} weight="duotone" className="text-emerald-500" />
 OpenClaw VPS Configuration
 </CardTitle>
 <CardDescription>
 Manage your OpenClaw VPS endpoint for NVIDIA free inference
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="openclaw-endpoint">VPS Endpoint</Label>
 <div className="flex gap-2">
 <Input
 id="openclaw-endpoint"
 type="text"
 placeholder="https://your-vps-hostname"
 value={openClawEndpoint}
 onChange={(e) => setOpenClawEndpoint(e.target.value)}
 className="flex-1"
 />
 </div>
 </div>

 <div className="flex gap-2">
 <Button
 onClick={saveOpenClawEndpoint}
 className="flex-1"
 >
 <FloppyDisk size={16} weight="bold" className="mr-2" />
 Save Endpoint
 </Button>
 <Button
 onClick={testOpenClawConnection}
 variant="outline"
 className="flex-1"
 disabled={testingConnection}
 >
 {testingConnection ? (
 <>
 <ArrowsClockwise size={16} weight="bold" className="mr-2 animate-spin" />
 Testing...
 </>
 ) : (
 <>
 <CheckCircle size={16} weight="bold" className="mr-2" />
 Test Connection
 </>
 )}
 </Button>
 </div>

 <div className="p-3 bg-transparent rounded-lg">
 <p className="text-xs text-emerald-500">
 <strong>Status:</strong> {openClawConnected ? 'VPS Online — NVIDIA free inference active ($0/token)' : 'VPS Offline — check your connection'}
 </p>
 </div>
 </CardContent>
 </Card>

 {/* OpenClaw Status Card */}
 <Card className={`border ${openClawConnected ? '' : ''} bg-card/50 backdrop-blur`}>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2">
 <Pulse size={20} weight="duotone" className={`${openClawConnected ? 'text-emerald-500' : 'text-red-500'}`} />
 OpenClaw VPS Status
 </CardTitle>
 <CardDescription>
 NVIDIA free inference via VPS agent swarm
 </CardDescription>
 </div>
 <span className="flex items-center gap-1.5 text-xs">
 <span className={`w-1.5 h-1.5 rounded-full ${openClawConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
 <span className={openClawConnected ? 'text-emerald-500' : 'text-red-500'}>
 {openClawConnected ? 'Online' : 'Offline'}
 </span>
 </span>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Available Models</p>
 <p className="text-2xl font-bold text-emerald-500">{models.length}</p>
 </div>
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Cost Per Token</p>
 <p className="text-2xl font-bold text-emerald-500">$0</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Models Summary Stats */}
 <div className="grid gap-4 md:grid-cols-3">
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">Total Models</CardTitle>
 <Brain size={16} weight="bold" className="text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-emerald-500">{loadingModels ? '...' : models.length}</div>
 <p className="text-xs text-muted-foreground">
 {loadingModels ? 'Loading...' : models.length === 0 ? 'No models found' : 'Available models'}
 </p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">VPS Status</CardTitle>
 <Pulse size={16} weight="bold" className="text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-emerald-500">
 {openClawConnected ? 'Online' : 'Offline'}
 </div>
 <p className="text-xs text-muted-foreground">NVIDIA Free Inference</p>
 </CardContent>
 </Card>

 <Card className="bg-card/50 backdrop-blur">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium text-white">Cost</CardTitle>
 <Lightning size={16} weight="bold" className="text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-emerald-500">$0</div>
 <p className="text-xs text-muted-foreground">Per token</p>
 </CardContent>
 </Card>
 </div>

 {/* Refresh Button */}
 <div className="flex justify-end">
 <Button
 onClick={fetchModels}
 variant="outline"
 size="sm"
 disabled={loadingModels}
 >
 <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loadingModels ? 'animate-spin' : ''}`} />
 Refresh Models
 </Button>
 </div>

 {/* Models List */}
 {loadingModels ? (
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <ArrowsClockwise size={64} weight="duotone" className="text-emerald-500 mb-4 animate-spin" />
 <h3 className="text-lg font-semibold text-white mb-2">Loading Models...</h3>
 <p className="text-muted-foreground text-center">
 Fetching available OpenClaw models
 </p>
 </CardContent>
 </Card>
 ) : models.length === 0 ? (
 <Card className="bg-card/50 backdrop-blur">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <Brain size={64} weight="duotone" className="text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold text-white mb-2">No Models Available</h3>
 <p className="text-muted-foreground text-center mb-4">
 Connect to OpenClaw VPS to access models
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-6">
 {models.map((model) => (
 <Card key={model.id} className="bg-card/50 backdrop-blur transition-colors">
 <CardHeader>
 <div className="flex items-start justify-between">
 <div>
 <CardTitle className="text-white flex items-center gap-2">
 <Brain size={20} weight="duotone" className="text-emerald-500" />
 {model.name || model.id}
 </CardTitle>
 <CardDescription className="terminal-text mt-1">
 Context: {model.context_length?.toLocaleString() || 'N/A'} tokens
 </CardDescription>
 </div>
 <span className="text-xs text-emerald-500">OpenClaw</span>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-4 md:grid-cols-3">
 <div>
 <p className="text-xs text-muted-foreground mb-1">Model ID</p>
 <p className="text-sm font-medium text-white terminal-text">{model.id}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground mb-1">Type</p>
 <p className="text-sm font-medium text-white">{model.type}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
 <div className="flex flex-wrap gap-1">
 {model.capabilities?.slice(0, 3).map((cap, i) => (
 <span key={i} className="text-xs text-emerald-500">{cap}</span>
 ))}
 </div>
 </div>
 </div>
 {model.pricing && (
 <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-white/[0.04]">
 <span>Input: ${model.pricing.input}/M tokens</span>
 <span>•</span>
 <span>Output: ${model.pricing.output}/M tokens</span>
 </div>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </TabsContent>

 <TabsContent value="mcp" className="space-y-4">
 <MCP />
 </TabsContent>

 <TabsContent value="tools" className="space-y-4">
 <Tools />
 </TabsContent>

 <TabsContent value="memory" className="space-y-4">
 <Memory />
 </TabsContent>

 <TabsContent value="security" className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>Security Settings</CardTitle>
 <CardDescription>Configure security and access controls</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Two-Factor Authentication</Label>
 <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
 </div>
 <Switch
 checked={twoFactorAuth}
 onCheckedChange={setTwoFactorAuth}
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Encrypted Storage</Label>
 <p className="text-sm text-muted-foreground">Encrypt all stored data</p>
 </div>
 <Switch
 checked={encryptedStorage}
 onCheckedChange={setEncryptedStorage}
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Audit Logging</Label>
 <p className="text-sm text-muted-foreground">Track all system activities</p>
 </div>
 <Switch
 checked={auditLogging}
 onCheckedChange={setAuditLogging}
 />
 </div>
 <Separator />
 <div className="flex justify-end">
 <Button
 onClick={handleSaveSecurity}
 size="sm"
 >
 <FloppyDisk size={16} weight="bold" className="mr-2" />
 Save Security Settings
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="integrations" className="space-y-4">
 {/* Inoreader Integration */}
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2">
 <RssSimple size={20} weight="duotone" className="text-emerald-500" />
 Inoreader Integration
 </CardTitle>
 <CardDescription>
 Connect your Inoreader account to aggregate cyber security news feeds
 </CardDescription>
 </div>
 {inoreaderAuth ? (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-emerald-500">Connected</span>
 </span>
 ) : (
 <span className="flex items-center gap-1.5 text-xs">
 <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
 <span className="text-red-500">Not Connected</span>
 </span>
 )}
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {inoreaderAuth ? (
 <>
 <div className="flex items-center justify-between p-4 bg-transparent rounded-lg">
 <div>
 <p className="text-sm font-medium text-emerald-500">Authentication Status</p>
 <p className="text-xs text-muted-foreground mt-1">
 Your Inoreader account is successfully connected
 </p>
 </div>
 <CheckCircle size={32} weight="duotone" className="text-emerald-500" />
 </div>

 <Separator />

 <div className="space-y-2">
 <Label>API Usage Statistics</Label>
 <div className="grid grid-cols-2 gap-4">
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Calls Today</p>
 <p className="text-2xl font-bold text-primary">{apiUsage.count}/{apiUsage.limit}</p>
 </div>
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Remaining</p>
 <p className="text-2xl font-bold text-primary">{apiUsage.remaining}</p>
 </div>
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Usage</p>
 <p className="text-2xl font-bold text-primary">{apiUsage.percentUsed.toFixed(1)}%</p>
 </div>
 <div className="p-3 bg-muted/50 rounded-lg">
 <p className="text-xs text-muted-foreground">Resets At</p>
 <p className="text-sm font-bold text-primary">{apiUsage.resetTime.toLocaleTimeString()}</p>
 </div>
 </div>
 </div>

 <Separator />

 <Button
 variant="destructive"
 onClick={handleInoreaderLogout}
 className="w-full"
 >
 Disconnect Inoreader
 </Button>
 </>
 ) : (
 <div className="text-center py-8">
 <RssSimple size={64} weight="duotone" className="mx-auto mb-4 text-primary/50" />
 <h3 className="text-lg font-semibold mb-2">Connect Your Inoreader Account</h3>
 <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
 Aggregate cyber security news from multiple sources including The Hacker News,
 Bleeping Computer, CVE feeds, and more in your Command Center dashboard.
 </p>
 <Button
 onClick={handleInoreaderAuth}
 size="sm"
 >
 <RssSimple size={16} weight="bold" />
 Connect Inoreader Account
 </Button>
 <p className="text-xs text-muted-foreground mt-4">
 You'll be redirected to Inoreader to authorize the connection
 </p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Ollama Configuration */}
 <Card className="bg-card/50 backdrop-blur">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Brain size={20} weight="duotone" className="text-primary" />
 Ollama Configuration
 </CardTitle>
 <CardDescription>Configure your local Ollama instance for AI model inference</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="ollama-endpoint">Ollama Endpoint URL</Label>
 <Input
 id="ollama-endpoint"
 placeholder="http://localhost:11434"
 value={ollamaEndpoint}
 onChange={(e) => setOllamaEndpoint(e.target.value)}
 className="terminal-text"
 />
 <p className="text-xs text-muted-foreground">
 Default: http://localhost:11434 (leave as-is for local installation)
 </p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="ollama-key">Ollama API Key (Optional)</Label>
 <Input
 id="ollama-key"
 type="password"
 placeholder="Leave empty for local instances"
 value={ollamaApiKey}
 onChange={(e) => setOllamaApiKey(e.target.value)}
 className="terminal-text"
 />
 <p className="text-xs text-muted-foreground">
 Only required if using a remote Ollama server with authentication
 </p>
 </div>
 <Separator />
 <div className="flex justify-end">
 <Button
 onClick={handleSaveIntegrations}
 size="sm"
 >
 <FloppyDisk size={16} weight="bold" className="mr-2" />
 Save Ollama Settings
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="advanced" className="space-y-4">
 <Card>
 <CardHeader>
 <CardTitle>Advanced Settings</CardTitle>
 <CardDescription>Fine-tune system behavior</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Debug Mode</Label>
 <p className="text-sm text-muted-foreground">Enable verbose logging</p>
 </div>
 <Switch
 checked={debugMode}
 onCheckedChange={setDebugMode}
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Experimental Features</Label>
 <p className="text-sm text-muted-foreground">Access beta functionality</p>
 </div>
 <Switch
 checked={experimentalFeatures}
 onCheckedChange={setExperimentalFeatures}
 />
 </div>
 <Separator />
 <div className="space-y-2">
 <Label>Max Concurrent Operations</Label>
 <Input
 type="number"
 value={maxConcurrentOps}
 onChange={(e) => setMaxConcurrentOps(parseInt(e.target.value) || 10)}
 className="terminal-text"
 />
 </div>
 <Separator />
 <div className="flex justify-end">
 <Button
 onClick={handleSaveAdvanced}
 size="sm"
 >
 <FloppyDisk size={16} weight="bold" className="mr-2" />
 Save Advanced Settings
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>System Logs</CardTitle>
 <CardDescription>Manage system activity logs</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Total Log Entries</Label>
 <p className="text-sm text-muted-foreground">{logs.length} entries stored locally</p>
 </div>
 <span className="text-xs text-primary">{logs.length}</span>
 </div>
 <Separator />
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Clear All Logs</Label>
 <p className="text-sm text-muted-foreground">Permanently delete all system logs</p>
 </div>
 <Button
 variant="destructive"
 size="sm"
 onClick={handleClearLogs}
 disabled={logs.length === 0}
 variant="destructive" size="sm"
 >
 <Trash size={16} weight="bold" className="mr-2" />
 Clear Logs
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Cache Management Card */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Database size={20} weight="duotone" />
 Cache Management
 </CardTitle>
 <CardDescription>Monitor and manage Supabase cache for API responses and conversations</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Cache Statistics */}
 {loadingCache ? (
 <div className="flex items-center justify-center py-8">
 <ArrowsClockwise size={32} weight="duotone" className="animate-spin text-primary" />
 </div>
 ) : (
 <>
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 bg-muted/50 rounded-lg border">
 <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
 <p className="text-2xl font-bold text-primary">
 {cacheStats.reduce((sum, stat) => sum + stat.total_entries, 0)}
 </p>
 </div>
 <div className="p-4 bg-muted/50 rounded-lg border">
 <p className="text-xs text-muted-foreground mb-1">Cache Size</p>
 <p className="text-2xl font-bold text-primary">
 {(cacheSize / 1024 / 1024).toFixed(2)} MB
 </p>
 </div>
 </div>

 {cacheStats.length > 0 && (
 <>
 <Separator />
 <div className="space-y-2">
 <Label>Cache Breakdown by Type</Label>
 <div className="space-y-2">
 {cacheStats.map((stat) => (
 <div key={stat.cache_type} className="flex items-center justify-between p-2 bg-muted/30 rounded">
 <div>
 <p className="text-sm font-medium capitalize">{stat.cache_type.replace('_', ' ')}</p>
 <p className="text-xs text-muted-foreground">
 {stat.valid_entries} valid • {stat.expired_entries} expired
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm font-bold">{stat.total_entries}</p>
 <p className="text-xs text-muted-foreground">
 {stat.total_size_mb.toFixed(2)} MB
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 )}

 <Separator />

 {/* Cache Actions */}
 <div className="flex gap-2">
 <Button
 onClick={loadCacheStats}
 variant="outline"
 size="sm"
 disabled={loadingCache}
 className="flex-1"
 >
 <ArrowsClockwise size={16} weight="bold" className={`mr-2 ${loadingCache ? 'animate-spin' : ''}`} />
 Refresh Stats
 </Button>
 <Button
 onClick={handleCleanupCache}
 variant="outline"
 size="sm"
 className="flex-1"
 >
 <Wrench size={16} weight="bold" className="mr-2" />
 Cleanup Expired
 </Button>
 <Button
 onClick={handleClearCache}
 variant="destructive"
 size="sm"
 disabled={clearingCache || cacheStats.length === 0}
 className="flex-1 bg-transparent hover:bg-white/[0.03] border border-transparent"
 >
 <Trash size={16} weight="bold" className="mr-2" />
 Clear All Cache
 </Button>
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Agent Testing Tab */}
 <TabsContent value="testing" className="space-y-4">
 <AgentTesting />
 </TabsContent>
 </Tabs>
 </div>
 );
};

export default Settings;
