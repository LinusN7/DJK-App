import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const LockerDutyList = () => {
  const { user, isAdmin } = useAuth();
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: lockerDuties, refetch } = useQuery({
    queryKey: ['locker-duties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locker_duties')
        .select('*')
        .order('week_start', { ascending: true });
      
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

  const { data: allPlayers } = useQuery({
    queryKey: ['all-players-locker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const weeks = [...new Map(
    lockerDuties?.map(d => [`${d.week_start}-${d.week_end}`, { start: d.week_start, end: d.week_end }]) || []
  ).values()];

  const handleAddWeek = async () => {
    if (!weekStart || !weekEnd) {
      toast.error('Bitte beide Daten eingeben');
      return;
    }

    if (new Date(weekStart) > new Date(weekEnd)) {
      toast.error('Startdatum muss vor Enddatum liegen');
      return;
    }

    setWeekStart('');
    setWeekEnd('');
    toast.success('Woche hinzugefügt');
    refetch();
  };

  const handleAssign = async (start: string, end: string, userId?: string) => {
    const targetUserId = userId || user!.id;

    // Get user's team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('user_id', user!.id)
      .single();

    const { error } = await supabase
      .from('locker_duties')
      .insert({
        week_start: start,
        week_end: end,
        user_id: targetUserId,
        assigned_by: user!.id,
        team_id: profile!.team_id,
      });

    if (error) {
      toast.error('Fehler beim Eintragen');
      console.error(error);
      return;
    }

    // Increment locker_duty_count
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('locker_duty_count')
      .eq('user_id', targetUserId)
      .single();

    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({ locker_duty_count: currentProfile.locker_duty_count + 1 })
        .eq('user_id', targetUserId);
    }

    toast.success('Eintrag erfolgreich');
    setSelectedUserId('');
    refetch();
  };

  const handleRemove = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('locker_duties')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Entfernen');
      console.error(error);
      return;
    }

    // Decrement locker_duty_count
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('locker_duty_count')
      .eq('user_id', userId)
      .single();

    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({ locker_duty_count: Math.max(0, currentProfile.locker_duty_count - 1) })
        .eq('user_id', userId);
    }

    toast.success('Eintrag entfernt');
    refetch();
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="week-start">Von</Label>
                <Input
                  id="week-start"
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="week-end">Bis</Label>
                <Input
                  id="week-end"
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddWeek} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Woche hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Noch keine Wochen eingetragen
            </p>
          </CardContent>
        </Card>
      ) : (
        weeks.map((week) => {
          const duties = lockerDuties?.filter(
            d => d.week_start === week.start && d.week_end === week.end
          ) || [];
          const userAssigned = duties.some(d => d.user_id === user?.id);
          const canAssign = duties.length < 3;

          return (
            <Card key={`${week.start}-${week.end}`}>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">
                  {format(new Date(week.start), 'PP', { locale: de })} - {format(new Date(week.end), 'PP', { locale: de })}
                </h3>
                
                {duties.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {duties.map((duty) => (
                      <div key={duty.id} className="flex items-center justify-between text-sm">
                        <span>🚪 {duty.profile?.full_name || 'Unbekannt'}</span>
                        {(duty.user_id === user?.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(duty.id, duty.user_id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!userAssigned && canAssign && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAssign(week.start, week.end)}
                  >
                    Eintragen ({duties.length}/3)
                  </Button>
                )}

                {isAdmin && canAssign && (
                  <div className="mt-3 space-y-2">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Spieler auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPlayers?.map((player) => (
                          <SelectItem key={player.user_id} value={player.user_id}>
                            {player.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => selectedUserId && handleAssign(week.start, week.end, selectedUserId)}
                      disabled={!selectedUserId}
                    >
                      Spieler eintragen
                    </Button>
                  </div>
                )}
                
                {!canAssign && !userAssigned && (
                  <p className="text-sm text-muted-foreground text-center">
                    Bereits voll belegt (3/3)
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default LockerDutyList;
