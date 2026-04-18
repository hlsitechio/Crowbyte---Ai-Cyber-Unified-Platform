import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UilUser, UilSync, UilSignout, UilTimes, UilEnvelope, UilCalendarAlt, UilKeySkeleton, UilPlaneFly, UilCopy, UilShieldCheck, UilEye, UilEyeSlash } from "@iconscout/react-unicons";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

export default function ProfileSettings() {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [sendingKey, setSendingKey] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const tier = user?.user_metadata?.tier || 'free';

  useEffect(() => {
    loadProfilePicture();
    loadLicenseKey();
  }, []);

  const loadLicenseKey = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('license_keys')
        .select('license_key, workspace_id, tier')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading license key:', error);
        return;
      }
      if (data?.license_key) {
        setLicenseKey(data.license_key);
      } else {
        // No key yet — auto-generate one (happens for users created before trigger was added)
        const { data: newKey } = await supabase.rpc('regenerate_license_key', { p_user_id: user.id });
        const key = (newKey as any)?.[0]?.new_key;
        if (key) setLicenseKey(key);
      }
    } catch (error) {
      console.error('Failed to load license key:', error);
    }
  };

  const handleSendKey = async () => {
    if (!user) return;
    setSendingKey(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const resp = await fetch('/api/mailer/send-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Failed to send key');

      toast({
        title: "License Key Sent",
        description: `Your license key has been sent to ${user.email}`,
      });
    } catch (error) {
      console.error('Failed to send key:', error);
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : "Failed to send license key",
        variant: "destructive",
      });
    } finally {
      setSendingKey(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('regenerate_license_key', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const newKey = data?.[0]?.new_key;
      if (newKey) {
        setLicenseKey(newKey);
        toast({
          title: "Key Regenerated",
          description: "Your old key has been revoked. A new key is now active.",
        });
      }
    } catch (error) {
      console.error('Failed to regenerate key:', error);
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate license key",
        variant: "destructive",
      });
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 7) return key;
    return key.slice(0, 3) + '••••-••••-••••-' + key.slice(-4);
  };

  const handleCopyKey = async () => {
    if (!licenseKey) return;
    try {
      await navigator.clipboard.writeText(licenseKey);
      toast({ title: "Copied", description: "License key copied to clipboard" });
    } catch {
      // Fallback for Electron
      const ta = document.createElement('textarea');
      ta.value = licenseKey;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast({ title: "Copied", description: "License key copied to clipboard" });
    }
  };

  const handleSaveToKeyManager = async () => {
    if (!licenseKey || !user) return;

    // Try PasswordCredential API (works with Bitwarden, 1Password, browser built-in)
    if ('PasswordCredential' in window) {
      try {
        const cred = new (window as any).PasswordCredential({
          id: user.email || 'crowbyte-license',
          password: licenseKey,
          name: `CrowByte License UilKeySkeleton (${tier})`,
        });
        await (navigator as any).credentials.store(cred);
        toast({
          title: "Saved to Password Manager",
          description: "Your license key has been offered to your password manager",
        });
        return;
      } catch {
        // PasswordCredential not supported or user dismissed
      }
    }

    // Fallback: copy + prompt user
    await handleCopyKey();
    toast({
      title: "Key Copied — Save It Manually",
      description: "Paste into Bitwarden/1Password as a secure note. Site: crowbyte.io",
    });
  };

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

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPicture(true);

    try {
      if (profilePictureUrl) {
        const oldPath = profilePictureUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-pictures')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;
      const { error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      setProfilePictureUrl(publicUrl);
      window.dispatchEvent(new Event('profilePictureChanged'));

      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been uploaded successfully",
      });
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  const handleExitApp = async () => {
    if (window.electronAPI?.quitApp) {
      await window.electronAPI.quitApp();
    } else {
      toast({
        title: "Exit not available",
        description: "Exit app is only available in Electron desktop mode.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UilUser size={20} className="text-primary" />
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
                <UilUser size={32} className="text-primary" />
              )}
            </div>
            <label
              htmlFor="profile-picture-upload"
              className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploadingPicture ? (
                <UilSync size={20} className="text-white animate-spin" />
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
              <UilEnvelope size={16} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <UilCalendarAlt size={16} className="text-muted-foreground" />
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

        {/* Account Details */}
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

        {/* Account Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <UilSignout size={14} />
            Logout
          </button>
          <button
            onClick={handleExitApp}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1.5"
          >
            <UilTimes size={14} />
            Exit
          </button>
        </div>
      </CardContent>

      {/* License UilKeySkeleton Section — paid users only */}
      {licenseKey && licenseKey !== 'free-user' && (
        <>
          <CardHeader className="pt-2 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UilKeySkeleton size={18} className="text-primary" />
              License UilKeySkeleton
            </CardTitle>
            <CardDescription>One key for all your devices — desktop, server, everywhere</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
              <code className="flex-1 text-sm font-mono text-zinc-300 tracking-wider select-all">
                {keyRevealed ? licenseKey : maskKey(licenseKey)}
              </code>
              <button
                onClick={() => setKeyRevealed(!keyRevealed)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                title={keyRevealed ? 'Hide key' : 'Reveal key'}
              >
                {keyRevealed ? <UilEyeSlash size={16} /> : <UilEye size={16} />}
              </button>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                tier === 'pro' || tier === 'professional'
                  ? 'bg-blue-500/20 text-blue-400'
                  : tier === 'team'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {tier}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSaveToKeyManager}
                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <UilShieldCheck size={14} />
                Add to Password Manager
              </button>
              <button
                onClick={handleCopyKey}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <UilCopy size={14} />
                UilCopy
              </button>
              <button
                onClick={handleSendKey}
                disabled={sendingKey}
                className="text-xs text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingKey ? (
                  <UilSync size={14} className="animate-spin" />
                ) : (
                  <UilPlaneFly size={14} />
                )}
                {sendingKey ? 'Sending...' : 'Email My UilKeySkeleton'}
              </button>
              <button
                onClick={handleRegenerateKey}
                className="text-xs text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1.5"
              >
                <UilSync size={14} />
                Regenerate
              </button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
