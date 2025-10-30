import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddLockerDutyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddLockerDutyDialog({ open, onOpenChange, onSuccess }: AddLockerDutyDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!startDate || !endDate) {
      toast.error("Bitte Start- und Enddatum angeben");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Startdatum muss vor Enddatum liegen");
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("locker_duties")
        .select("id")
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error("Diese Woche existiert bereits");
        return;
      }

      const { error } = await supabase.from("locker_duties").insert([
        { start_date: startDate, end_date: endDate },
        { start_date: startDate, end_date: endDate },
        { start_date: startDate, end_date: endDate },
      ]);

      if (error) throw error;

      toast.success("Neue Woche hinzugefügt");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Woche hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Von</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Bis</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
