import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const WashList = () => {
  const { user, isAdmin } = useAuth();
  const [newGameDay, setNewGameDay] = useState('');

  const { data: washDuties, refetch } = useQuery({
    queryKey: ['wash-duties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wash_duties')
        .select('*')
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;

      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(duty => ({
        ...duty,
        profile: profileMap.get(duty.user_id),
      }));
    },
  });

  const gameDays = [...new Set(washDuties?.map(d => d.game_day) || [])];

  const handleAddGameDay = async () => {
    if (!newGameDay.trim()) {
      toast.error('Bitte Spieltag eingeben');
      return;
    }

    if (gameDays.includes(newGameDay.trim())) {
      toast.error('Spieltag existiert bereits');
      return;
    }

    setNewGameDay('');
    toast.success('Spieltag hinzugefügt');
    refetch();
  };

  const handleAssign = async (gameDay: string, userId?: string) => {
    const { error } = await supabase
      .from('wash_duties')
      .insert({
        game_day: gameDay,
        user_id: userId || user!.id,
        assigned_by: user!.id,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Bereits für diesen Spieltag eingetragen');
      } else {
        toast.error('Fehler beim Eintragen');
        console.error(error);
      }
      return;
    }

    toast.success('Eintrag erfolgreich');
    refetch();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from('wash_duties')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Entfernen');
      console.error(error);
      return;
    }

    toast.success('Eintrag entfernt');
    refetch();
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Spieltag (z.B. 15. Spieltag)"
                value={newGameDay}
                onChange={(e) => setNewGameDay(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddGameDay()}
              />
              <Button onClick={handleAddGameDay}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {gameDays.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Noch keine Spieltage eingetragen
            </p>
          </CardContent>
        </Card>
      ) : (
        gameDays.map((gameDay) => {
          const duties = washDuties?.filter(d => d.game_day === gameDay) || [];
          const userAssigned = duties.some(d => d.user_id === user?.id);

          return (
            <Card key={gameDay}>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">{gameDay}</h3>
                
                {duties.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {duties.map((duty) => (
                      <div key={duty.id} className="flex items-center justify-between text-sm">
                        <span>🧺 {duty.profile?.full_name || 'Unbekannt'}</span>
                        {(duty.user_id === user?.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(duty.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!userAssigned && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAssign(gameDay)}
                  >
                    Eintragen
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default WashList;
