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
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";


const Games = () => {
  const { isAdmin } = useAuth();
  const [addGameOpen, setAddGameOpen] = useState(false);
  const navigate = useNavigate();

  
  const {
  data: games = [],  // 👈 hier setzen wir ein leeres Array als Standardwert
  refetch,
  isLoading,
  isError,
  error,
} = useQuery<any[], Error>({  // 👈 das sagt TypeScript: games ist ein Array
  queryKey: ["games"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: false });
    if (error) throw error;
    return data || [];  // 👈 falls Supabase kein Ergebnis liefert
  },
});


  // 🟡 Ladezustand
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        Lädt Carpool ...
      </div>
    );
  }

  // 🔴 Fehlerzustand
  if (isError) {
    return (
      <div className="container mx-auto p-6 text-center text-red-500">
        Fehler beim Laden: {(error as Error)?.message || "Unbekannter Fehler"}
        <div className="mt-4">
          <Button onClick={() => refetch()}>Erneut versuchen</Button>
        </div>
      </div>
    );
  }

  // 🟢 Normaler Zustand
  return (
    <div className="container mx-auto p-4 pb-24 space-y-6">
      <PageHeader title="Carpool" />

      {isAdmin && (
        <div className="text-center">
          <Button onClick={() => setAddGameOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Spieltag hinzufügen
          </Button>
        </div>
      )}


      {/* Spieleliste */}
      {games?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Noch keine Spiele eingetragen
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {games?.map((game) => (
            <Card
              key={game.id}
              className="hover:bg-accent/50 cursor-pointer transition"
              role="button"
              onClick={() => navigate(`/games/${game.id}`)}
            >
              <GameCard game={game} onUpdate={refetch} />
            </Card>
          ))}
        </div>
      )}

      {/* Dialog zum Spiel hinzufügen */}
      <AddGameDialog
        open={addGameOpen}
        onOpenChange={setAddGameOpen}
        onSuccess={() => {
          toast.success("Spiel erfolgreich hinzugefügt");
          refetch();
          setAddGameOpen(false);
        }}
      />
    </div>
  );
};

export default Games;
