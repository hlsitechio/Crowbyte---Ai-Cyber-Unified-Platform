import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon, ArrowsClockwise, SignOut, X, Envelope, Calendar } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

export default function ProfileSettings() {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    loadProfilePicture();
  }, []);

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
        });

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
  );
}
