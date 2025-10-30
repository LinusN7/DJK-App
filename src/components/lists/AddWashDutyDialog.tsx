import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddWashDutyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddWashDutyDialog({ open, onOpenChange, onSuccess }: AddWashDutyDialogProps) {
  const [gameDay, setGameDay] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!gameDay.trim() || !gameDate) {
      toast.error("Bitte Spieltag und Datum angeben");
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("wash_duties")
        .select("id")
        .eq("game_day", gameDay.trim())
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error("Dieser Spieltag existiert bereits");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("wash_duties")
        .insert([{ game_day: gameDay.trim(), game_date: gameDate }]);

      if (error) throw error;

      toast.success("Spieltag erfolgreich hinzugefügt");
      onSuccess();
      onOpenChange(false);
      setGameDay("");
      setGameDate("");
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Hinzufügen des Spieltags");
    } finally {
      setLoading(false);
    }
  };

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Neuen Waschdienst hinzufügen</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Spieltag</Label>
        <Input
          placeholder="z. B. 15. Spieltag oder Gegnername"
          value={gameDay}
          onChange={(e) => setGameDay(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Datum</Label>
        <Input
          type="date"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
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
          onClick={handleAdd} 
          className="w-full bg-djk-green hover:bg-djk-green/90 text-white" 
          disabled={loading}>
          {loading ? "Lädt ..." : "Hinzufügen"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

  );
}
