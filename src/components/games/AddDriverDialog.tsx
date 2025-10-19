import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  onSuccess: () => void;
}

const AddDriverDialog = ({ open, onOpenChange, gameId, onSuccess }: AddDriverDialogProps) => {
  const { user } = useAuth();
  const [departureLocation, setDepartureLocation] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!departureLocation.trim() || !availableSeats) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    const seats = parseInt(availableSeats);
    if (seats < 1 || seats > 8) {
      toast.error('Anzahl Plätze muss zwischen 1 und 8 liegen');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('drivers')
      .insert({
        game_id: gameId,
        user_id: user!.id,
        departure_location: departureLocation.trim(),
        available_seats: seats,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Du bist bereits als Fahrer eingetragen');
      } else {
        toast.error('Fehler beim Eintragen');
        console.error(error);
      }
      setLoading(false);
      return;
    }

    toast.success('Als Fahrer eingetragen');
    setDepartureLocation('');
    setAvailableSeats('');
    setLoading(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Als Fahrer eintragen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="departure">Abfahrtsort</Label>
            <Input
              id="departure"
              placeholder="z.B. Hauptbahnhof"
              value={departureLocation}
              onChange={(e) => setDepartureLocation(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Anzahl freier Plätze</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="8"
              placeholder="z.B. 3"
              value={availableSeats}
              onChange={(e) => setAvailableSeats(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Anzahl der Plätze zusätzlich zu deinem eigenen Sitzplatz
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Lädt...' : 'Eintragen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDriverDialog;
