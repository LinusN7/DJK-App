import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddGameDialog = ({ open, onOpenChange, onSuccess }: AddGameDialogProps) => {
  const { user } = useAuth();
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent.trim() || !gameDate) {
      toast.error("Bitte Gegner und Datum angeben");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("games").insert({
      opponent: opponent.trim(),
      game_date: gameDate,
      created_by: user!.id,
    });

    if (error) {
      toast.error("Fehler beim Erstellen");
      console.error(error);
      setLoading(false);
      return;
    }

    toast.success("Spiel hinzugefügt");
    setOpponent("");
    setGameDate("");
    setLoading(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Spieltag hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opponent">Gegner</Label>
            <Input
              id="opponent"
              placeholder="z. B. FC Beispiel"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game_date">Datum</Label>
            <Input
              id="game_date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              className="w-full bg-djk-green hover:bg-djk-green/90 text-white" 
              disabled={loading}>
              {loading ? "Lädt..." : "Hinzufügen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGameDialog;
