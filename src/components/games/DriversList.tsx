import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface DriversListProps {
  gameId: string;
  onUpdate: () => void;
}

const DriversList = ({ gameId, onUpdate }: DriversListProps) => {
  const { user } = useAuth();

  const { data: drivers, refetch } = useQuery({
    queryKey: ['drivers', gameId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('game_id', gameId);
      
      if (error) throw error;

      // Fetch profiles and passengers separately
      const driverIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', driverIds);

      const { data: passengers } = await supabase
        .from('passengers')
        .select('id, driver_id, user_id')
        .in('driver_id', data.map(d => d.id));

      const passengerUserIds = passengers?.map(p => p.user_id) || [];
      const { data: passengerProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', passengerUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const passengerProfileMap = new Map(passengerProfiles?.map(p => [p.user_id, p]) || []);

      return data.map(driver => ({
        ...driver,
        profile: profileMap.get(driver.user_id),
        passengers: passengers
          ?.filter(p => p.driver_id === driver.id)
          .map(p => ({
            ...p,
            profile: passengerProfileMap.get(p.user_id),
          })) || [],
      }));
    },
  });

  const handleJoinDriver = async (driverId: string, availableSeats: number, currentPassengers: number) => {
    if (currentPassengers >= availableSeats) {
      toast.error('Alle Plätze sind bereits belegt');
      return;
    }

    const { error } = await supabase
      .from('passengers')
      .insert({
        driver_id: driverId,
        user_id: user!.id,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Du bist bereits als Mitfahrer eingetragen');
      } else {
        toast.error('Fehler beim Eintragen');
        console.error(error);
      }
      return;
    }

    toast.success('Als Mitfahrer eingetragen');
    refetch();
    onUpdate();
  };

  const handleRemoveDriver = async (driverId: string) => {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', driverId);

    if (error) {
      toast.error('Fehler beim Entfernen');
      console.error(error);
      return;
    }

    toast.success('Fahrer entfernt');
    refetch();
    onUpdate();
  };

  const handleRemovePassenger = async (passengerId: string) => {
    const { error } = await supabase
      .from('passengers')
      .delete()
      .eq('id', passengerId);

    if (error) {
      toast.error('Fehler beim Entfernen');
      console.error(error);
      return;
    }

    toast.success('Mitfahrer entfernt');
    refetch();
    onUpdate();
  };

  if (!drivers || drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Noch keine Fahrer eingetragen
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {drivers.map((driver) => {
        const isUserDriver = driver.user_id === user?.id;
        const passengers = driver.passengers || [];
        const availableSeats = driver.available_seats - passengers.length;
        const isUserPassenger = passengers.some((p: any) => p.user_id === user?.id);
        const canJoin = !isUserDriver && !isUserPassenger && availableSeats > 0;

        return (
          <Card key={driver.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {driver.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{driver.profile?.full_name || 'Unbekannt'}</p>
                  <p className="text-sm text-muted-foreground">
                    📍 {driver.departure_location}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    🚗 {availableSeats} von {driver.available_seats} Plätze frei
                  </p>
                </div>
              </div>
              {isUserDriver && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDriver(driver.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {passengers.length > 0 && (
              <div className="ml-12 space-y-2 mb-3">
                {passengers.map((passenger: any) => (
                  <div key={passenger.id} className="flex items-center justify-between text-sm">
                    <span>👤 {passenger.profile?.full_name || 'Unbekannt'}</span>
                    {(passenger.user_id === user?.id || isUserDriver) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePassenger(passenger.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canJoin && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleJoinDriver(driver.id, driver.available_seats, passengers.length)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Als Mitfahrer eintragen
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default DriversList;
