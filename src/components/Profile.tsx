import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      }

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("show-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("show-photos")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile updated! 🎉");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Profile Picture Card */}
      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/[0.05] border-2 border-white/[0.1] flex items-center justify-center">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-white/40 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}>✦</span>
              )}
            </div>
            
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Click to upload a new profile picture
          </p>
          
          <Input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                defaultValue="musiclover"
                placeholder="Your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input
                id="fullname"
                defaultValue="Alex Johnson"
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue="alex@example.com"
                placeholder="your@email.com"
              />
            </div>

            <Button type="submit" className="w-full">
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-card">
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public Profile</p>
              <p className="text-sm text-muted-foreground">
                Allow others to see your show history
              </p>
            </div>
            <Button variant="outline" size="sm">
              Coming Soon
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Friend Requests</p>
              <p className="text-sm text-muted-foreground">
                Connect with other music lovers
              </p>
            </div>
            <Button variant="outline" size="sm">
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
