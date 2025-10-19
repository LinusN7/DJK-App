import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const Players = () => {
  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Get wash duty counts
      const { data: washData } = await supabase
        .from('wash_duties')
        .select('user_id');

      // Get locker duty counts
      const { data: lockerData } = await supabase
        .from('locker_duties')
        .select('user_id');

      // Get admin roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      const adminIds = new Set(rolesData?.map(r => r.user_id) || []);
      
      const washCounts = washData?.reduce((acc, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const lockerCounts = lockerData?.reduce((acc, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return profilesData.map(profile => ({
        ...profile,
        washCount: washCounts[profile.user_id] || 0,
        lockerCount: lockerCounts[profile.user_id] || 0,
        isAdmin: adminIds.has(profile.user_id),
      }));
    },
  });

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
                    <span>🧺 Gewaschen: {player.washCount}x</span>
                    <span>🚪 Kabinendienst: {player.lockerCount}x</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Players;
