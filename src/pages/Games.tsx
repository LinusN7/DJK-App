import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import GameCard from '@/components/games/GameCard';
import AddGameDialog from '@/components/games/AddGameDialog';
const Games = () => {
  const {
    isAdmin
  } = useAuth();
  const [addGameOpen, setAddGameOpen] = useState(false);
  const {
    data: games,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('games').select('*').order('game_date', {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });
  if (isLoading) {
    return <div className="container mx-auto p-4">
        <p className="text-center text-muted-foreground">Lädt...</p>
      </div>;
  }
  return <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center">Fahrliste</h1>
        {isAdmin && <Button onClick={() => setAddGameOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Spiel hinzufügen
          </Button>}
      </div>

      {games && games.length === 0 ? <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Noch keine Spiele eingetragen
            </p>
          </CardContent>
        </Card> : <div className="space-y-4">
          {games?.map(game => <GameCard key={game.id} game={game} onUpdate={refetch} />)}
        </div>}

      <AddGameDialog open={addGameOpen} onOpenChange={setAddGameOpen} onSuccess={refetch} />
    </div>;
};
export default Games;