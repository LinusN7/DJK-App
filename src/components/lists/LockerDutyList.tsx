import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brush } from "lucide-react";
import { BroomIcon } from "../icons/BroomIcon";
import AddLockerDutyDialog from "@/components/lists/AddLockerDutyDialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const LockerDutyList = () => {
  const { user, isAdmin } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);


  // 🔹 Kabinendienste abrufen (sichtbar für ALLE)
  const { data: lockerDuties, refetch } = useQuery({
    queryKey: ["locker-duties"],
    queryFn: async () => {
      // 👇 Hier KEINE Einschränkung auf Admins
      const { data, error } = await supabase
        .from("locker_duties")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;

      // 👇 Profile laden für alle eingetragenen Spieler
      const userIds = [...new Set(data.map((d) => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return data.map((duty) => ({
        ...duty,
        profile: duty.assigned_to ? profileMap.get(duty.assigned_to) : null,
      }));
    },
  });

  // 🔹 Spieler abrufen (nur für Admin-Auswahl nötig)
  const { data: allPlayers } = useQuery({
    queryKey: ["all-players-locker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin, // 👈 nur Admin braucht diese Liste
  });

  // 🔹 Wochen gruppieren
  const weeks = [
    ...new Map(
      lockerDuties?.map((d) => [
        `${d.start_date}-${d.end_date}`,
        { start: d.start_date, end: d.end_date },
      ]) || []
    ).values(),
  ];

  // ➕ Woche hinzufügen (nur Admin)
  const handleAddWeek = async () => {
    if (!startDate || !endDate) {
      toast.error("Bitte Start- und Enddatum angeben");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Startdatum muss vor Enddatum liegen");
      return;
    }

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
      { start_date: startDate, end_date: endDate, assigned_to: null },
      { start_date: startDate, end_date: endDate, assigned_to: null },
      { start_date: startDate, end_date: endDate, assigned_to: null },
    ]);

    if (error) {
      console.error("Fehler beim Hinzufügen:", error);
      toast.error("Fehler beim Hinzufügen der Woche");
      return;
    }

    toast.success("Woche hinzugefügt (3 freie Slots)");
    setStartDate("");
    setEndDate("");
    setShowAddForm(false);
    refetch();
  };

  // 👤 Spieler eintragen (auch Nicht-Admin)
  const handleAssign = async (start: string, end: string, userId?: string) => {
    const targetUserId = userId || user!.id;

    const { data: alreadyIn } = await supabase
      .from("locker_duties")
      .select("id")
      .eq("start_date", start)
      .eq("end_date", end)
      .eq("assigned_to", targetUserId);

    if (alreadyIn && alreadyIn.length > 0) {
      toast.error("Du bist bereits eingetragen");
      return;
    }

    const { data: emptySlot } = await supabase
      .from("locker_duties")
      .select("id")
      .eq("start_date", start)
      .eq("end_date", end)
      .is("assigned_to", null)
      .limit(1)
      .maybeSingle();

    if (!emptySlot) {
      toast.error("Diese Woche ist bereits voll (3/3)");
      return;
    }

    const { error } = await supabase
      .from("locker_duties")
      .update({ assigned_to: targetUserId })
      .eq("id", emptySlot.id);

    if (error) {
      console.error("Fehler beim Eintragen:", error);
      toast.error("Fehler beim Eintragen");
      return;
    }

    await supabase.rpc("inc_locker_duty_count", {
      p_user_id: targetUserId,
      p_delta: 1,
    });

    toast.success("Eingetragen!");
    setSelectedUserId("");
    refetch();
  };

  // ❌ Austragen (auch Nicht-Admin)
  const handleRemove = async (id: string, userId: string) => {
    const { error } = await supabase
      .from("locker_duties")
      .update({ assigned_to: null })
      .eq("id", id);

    if (error) {
      console.error("Fehler beim Austragen:", error);
      toast.error("Fehler beim Austragen");
      return;
    }

    await supabase.rpc("inc_locker_duty_count", {
      p_user_id: userId,
      p_delta: -1,
    });

    toast.success("Ausgetragen");
    refetch();
  };

  // 🗑️ Ganze Woche löschen (nur Admin)
  const handleDeleteWeek = async (start: string, end: string) => {
    const { data: dutiesToDelete } = await supabase
      .from("locker_duties")
      .select("assigned_to")
      .eq("start_date", start)
      .eq("end_date", end);

    for (const duty of dutiesToDelete || []) {
      if (duty.assigned_to) {
        await supabase.rpc("inc_locker_duty_count", {
          p_user_id: duty.assigned_to,
          p_delta: -1,
        });
      }
    }

    const { error } = await supabase
      .from("locker_duties")
      .delete()
      .eq("start_date", start)
      .eq("end_date", end);

    if (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Fehler beim Löschen der Woche");
      return;
    }

    toast.success("Woche gelöscht");
    refetch();
  };

  // 🔹 UI
  return (
    <div className="space-y-4">
      {isAdmin && (
        <>
          <div className="flex justify-center">
            <Button 
              className="bg-djk-green hover:bg-djk-green/90 text-white" 
              onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Woche hinzufügen
            </Button>
          </div>

          <AddLockerDutyDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={refetch}
          />
        </>
      )}


      {/* Wochenanzeige */}
      {weeks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Noch keine Wochen eingetragen
          </CardContent>
        </Card>
      ) : (
        weeks.map((week) => {
          const duties =
            lockerDuties?.filter(
              (d) =>
                d.start_date === week.start &&
                d.end_date === week.end &&
                d.assigned_to !== null
            ) || [];

          const canAssign = duties.length < 3;

          return (
            <Card key={`${week.start}-${week.end}`}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-semibold">
                      {format(new Date(week.start), "PP", { locale: de })} –{" "}
                      {format(new Date(week.end), "PP", { locale: de })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {duties.length}/3 Spieler eingetragen
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteWeek(week.start, week.end)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {duties.map((duty) => (
                <div
                  key={duty.id}
                  className="flex items-center justify-between text-sm mb-2"
                >
                  <span className="flex items-center gap-2">
                    <BroomIcon className="h-5 w-5 text-djk-green" />
                    • {duty.profile?.full_name || "Unbekannt"}
                  </span>
                  {(duty.assigned_to === user?.id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(duty.id, duty.assigned_to)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                ))}

                {canAssign && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => handleAssign(week.start, week.end)}
                    >
                      Selbst eintragen
                    </Button>

                    {isAdmin && (
                      <div className="space-y-2">
                        <Select
                          value={selectedUserId}
                          onValueChange={setSelectedUserId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Spieler auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPlayers?.map((player) => (
                              <SelectItem
                                key={player.user_id}
                                value={player.user_id}
                              >
                                {player.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="w-full !bg-djk-green hover: !bg-djk-green/90 !text-white"
                          onClick={() =>
                            selectedUserId &&
                            handleAssign(week.start, week.end, selectedUserId)
                          }
                          disabled={!selectedUserId}
                        >
                          Spieler eintragen
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default LockerDutyList;
