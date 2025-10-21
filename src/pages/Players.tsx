import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

const Players = () => {
  const { user, isAdmin } = useAuth();

  const { data: players, isLoading, refetch } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Get admin roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      const adminIds = new Set(rolesData?.map(r => r.user_id) || []);

      return profilesData.map(profile => ({
        ...profile,
        isAdmin: adminIds.has(profile.user_id),
      }));
    },
  });

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast.error('Fehler beim Entfernen der Admin-Rechte');
        console.error(error);
        return;
      }
      toast.success('Admin-Rechte entfernt');
    } else {
      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast.error('Fehler beim Hinzufügen der Admin-Rechte');
        console.error(error);
        return;
      }
      toast.success('Admin-Rechte erteilt');
    }
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-3xl font-bold mb-6">Spieler</h1>
      
      <div className="space-y-3">
        {players?.map((player) => (
          <Card key={player.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={player.avatar_url} />
                  <AvatarFallback>
                    {player.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{player.full_name}</h3>
                    {player.isAdmin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                    {player.jersey_number && (
                      <Badge variant="outline">#{player.jersey_number}</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>🧺 Gewaschen: {player.wash_count}x</span>
                    <span>🚪 Kabinendienst: {player.locker_duty_count}x</span>
                  </div>
                </div>

                {isAdmin && player.user_id !== user?.id && (
                  <Button
                    variant={player.isAdmin ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleAdmin(player.user_id, player.isAdmin)}
                  >
                    {player.isAdmin ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-1" />
                        Entfernen
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-1" />
                        Admin
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Players;
