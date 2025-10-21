import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (error) throw error;
      
      setFullName(data.full_name);
      setEmail(user?.email || '');
      
      return data;
    },
    enabled: !!user,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Profilbild hochgeladen');
      refetch();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
        setNewPassword('');
      }

      toast.success('Profil aktualisiert');
      refetch();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Fehler beim Speichern');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Delete avatar from storage
      if (profile?.avatar_url) {
        const path = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([path]);
      }

      // Delete user (this will cascade delete profile, roles, etc.)
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;

      toast.success('Account gelöscht');
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Fehler beim Löschen. Bitte Admin kontaktieren.');
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-3xl font-bold mb-6">Profil</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profilbild</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl">
              {profile.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <label htmlFor="avatar-upload">
            <Button disabled={uploading} asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Lädt hoch...' : 'Bild hochladen'}
              </span>
            </Button>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">Neues Passwort (optional)</Label>
            <Input
              id="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leer lassen, wenn keine Änderung"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              🧺 Gewaschen: {profile.wash_count}x
            </div>
            <div className="text-sm text-muted-foreground">
              🚪 Kabinendienst: {profile.locker_duty_count}x
            </div>
            {profile.jersey_number && (
              <div className="text-sm text-muted-foreground">
                👕 Trikotnummer: #{profile.jersey_number}
              </div>
            )}
          </div>

          <Button onClick={handleSaveProfile} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Speichern
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Account löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden permanent gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
