import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import DriversList from './DriversList';
import AddDriverDialog from './AddDriverDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameCardProps {
  game: any;
  onUpdate: () => void;
}

const GameCard = ({ game, onUpdate }: GameCardProps) => {
  const { isAdmin } = useAuth();
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Möchtest du dieses Spiel wirklich löschen?')) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', game.id);
    
    if (error) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    } else {
      toast.success('Spiel gelöscht');
      onUpdate();
    }
    setDeleting(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">
                {game.opponent}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(game.game_date), 'PPP', { locale: de })} • {game.location}
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Mitfahrgelegenheiten</h3>
            <Button size="sm" onClick={() => setAddDriverOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Als Fahrer anbieten
            </Button>
          </div>
          
          <DriversList gameId={game.id} onUpdate={onUpdate} />
        </CardContent>
      </Card>

      <AddDriverDialog
        open={addDriverOpen}
        onOpenChange={setAddDriverOpen}
        gameId={game.id}
        onSuccess={() => {
          onUpdate();
          setAddDriverOpen(false);
        }}
      />
    </>
  );
};

export default GameCard;
