import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

type PlayerItem = {
  user_id: string;
  full_name: string;
  team: string | null;
  team_id: string | null;
  created_at: string;
  wash_count: number;
  locker_duty_count: number;
  avatar_url?: string | null;
  isAdmin: boolean;
};

const Players = () => {
  const { user, isAdmin } = useAuth();

  const { data: players, isLoading, refetch } = useQuery<PlayerItem[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminIds = new Set(rolesData?.map(r => r.user_id) || []);

      return (profilesData ?? []).map((profile: any) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        team: profile.team ?? null,
        team_id: profile.team_id ?? null,
        created_at: profile.created_at,
        wash_count: profile.wash_count ?? 0,
        locker_duty_count: profile.locker_duty_count ?? 0,
        avatar_url: profile.avatar_url ?? null,
        isAdmin: adminIds.has(profile.user_id),
      }));
    },
  });

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (!isAdmin) {
      toast.error('Nur Admins dürfen Rollen ändern');
      return;
    }

    try {
      if (currentlyAdmin) {
        // Admin -> Player
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'player' })
          .eq('user_id', userId);
        if (error) throw error;
        toast.success('Admin-Rechte entfernt');
      } else {
        // Player -> Admin (idempotent durch onConflict)
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('user_id', userId);
        if (error) throw error;
        toast.success('Admin-Rechte erteilt');
      }

      refetch();
    } catch (err) {
      console.error('Fehler beim Ändern der Admin-Rechte:', err);
      toast.error('Fehler beim Ändern der Admin-Rechte');
    }
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
          <Card key={player.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={player.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {player.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('') || '??'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{player.full_name || 'Unbekannt'}</h3>
                    {player.isAdmin && <Badge variant="secondary">Admin</Badge>}
                    {player.team && <Badge variant="outline">{player.team}</Badge>}
                  </div>

                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>🧺 Gewaschen: {player.wash_count}x</span>
                    <span>🚪 Kabinendienst: {player.locker_duty_count}x</span>
                  </div>
                </div>

                {isAdmin && player.user_id !== user?.id && (
                  <Button
                    variant={player.isAdmin ? 'destructive' : 'outline'}
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
