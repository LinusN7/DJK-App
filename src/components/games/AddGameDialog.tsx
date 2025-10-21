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

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddGameDialog = ({ open, onOpenChange, onSuccess }: AddGameDialogProps) => {
  const { user } = useAuth();
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!opponent.trim() || !location.trim() || !gameDate) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);

    // Get user's team_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('user_id', user!.id)
      .single();

    if (profileError || !profile) {
      toast.error('Profil konnte nicht geladen werden');
      console.error(profileError);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('games')
      .insert({
        opponent: opponent.trim(),
        location: location.trim(),
        game_date: new Date(gameDate).toISOString(),
        created_by: user!.id,
        team_id: profile.team_id,
      });

    if (error) {
      toast.error('Fehler beim Erstellen');
      console.error(error);
      setLoading(false);
      return;
    }

    toast.success('Spiel hinzugefügt');
    setOpponent('');
    setLocation('');
    setGameDate('');
    setLoading(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Auswärtsspiel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opponent">Gegner</Label>
            <Input
              id="opponent"
              placeholder="z.B. FC Beispiel"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ort</Label>
            <Input
              id="location"
              placeholder="z.B. Sportplatz XYZ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Datum & Uhrzeit</Label>
            <Input
              id="date"
              type="datetime-local"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Lädt...' : 'Hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGameDialog;
