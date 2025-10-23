import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddGameDialog from "@/components/games/AddGameDialog";
import GameCard from "@/components/games/GameCard";

const Games = () => {
  const { isAdmin } = useAuth();
  const [addGameOpen, setAddGameOpen] = useState(false);
  const navigate = useNavigate();

  const { data: games, refetch, isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: false });
      if (error) throw error;
      return data;
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Spieltage</h1>
        {isAdmin && (
          <Button onClick={() => setAddGameOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Spiel hinzufügen
          </Button>
        )}
      </div>

      {games?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Noch keine Spiele eingetragen
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {games?.map((game) => (
            <div
              key={game.id}
              onClick={() => navigate(`/games/${game.id}`)}
              className="cursor-pointer"
            >
              <GameCard game={game} onUpdate={refetch} />
            </div>
          ))}
        </div>
      )}

      <AddGameDialog
        open={addGameOpen}
        onOpenChange={setAddGameOpen}
        onSuccess={() => {
          refetch();
          setAddGameOpen(false);
        }}
      />
    </div>
  );
};

export default Games;
