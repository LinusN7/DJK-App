import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const WashList = () => {
  const { user, isAdmin } = useAuth();
  const [newGameDay, setNewGameDay] = useState("");
  const [newGameDate, setNewGameDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // 🔹 Waschdienste abrufen
  const { data: washDuties, refetch } = useQuery({
    queryKey: ["wash-duties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wash_duties")
        .select("*")
        .order("game_date", { ascending: false });

      if (error) throw error;

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

  const { data: allPlayers } = useQuery({
    queryKey: ["all-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const handleAddGameDay = async () => {
    if (!newGameDay.trim() || !newGameDate) {
      toast.error("Bitte Spieltag und Datum angeben");
      return;
    }

    const gameDay = newGameDay.trim();

    const { data: existing } = await supabase
      .from("wash_duties")
      .select("id")
      .eq("game_day", gameDay)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error("Spieltag existiert bereits");
      return;
    }

    const { error } = await supabase
      .from("wash_duties")
      .insert([{ game_day: gameDay, game_date: newGameDate }]);

    if (error) {
      console.error("Fehler beim Hinzufügen:", error);
      toast.error("Fehler beim Hinzufügen des Spieltags");
      return;
    }

    toast.success("Spieltag hinzugefügt");
    setNewGameDay("");
    setNewGameDate("");
    refetch();
  };

  const handleAssign = async (gameDay: string, userId?: string) => {
    const targetUserId = userId || user!.id;

    const { data: existing } = await supabase
      .from("wash_duties")
      .select("*")
      .eq("game_day", gameDay)
      .not("assigned_to", "is", null)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error("Dieser Spieltag ist bereits vergeben");
      return;
    }

    const { error } = await supabase
      .from("wash_duties")
      .update({ assigned_to: targetUserId })
      .eq("game_day", gameDay);

    if (error) {
      console.error("Fehler beim Eintragen:", error);
      toast.error("Fehler beim Eintragen");
      return;
    }

    // Waschzähler +1
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("wash_count")
      .eq("user_id", targetUserId)
      .single();

    if (currentProfile) {
      await supabase
        .from("profiles")
        .update({ wash_count: (currentProfile.wash_count || 0) + 1 })
        .eq("user_id", targetUserId);
    }

    toast.success("Eintrag erfolgreich");
    setSelectedUserId("");
    refetch();
  };

  const handleRemove = async (gameDay: string, userId: string) => {
    const { error } = await supabase
      .from("wash_duties")
      .update({ assigned_to: null })
      .eq("game_day", gameDay);

    if (error) {
      console.error("Fehler beim Entfernen:", error);
      toast.error("Fehler beim Entfernen");
      return;
    }

    // Waschzähler -1
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("wash_count")
      .eq("user_id", userId)
      .single();

    if (currentProfile) {
      await supabase
        .from("profiles")
        .update({
          wash_count: Math.max(0, (currentProfile.wash_count || 0) - 1),
        })
        .eq("user_id", userId);
    }

    toast.success("Eintrag entfernt");
    refetch();
  };

  // ❌ Admin löscht gesamten Spieltag (ohne Nachfrage)
  const handleDeleteGameDay = async (gameDay: string) => {
    // Alle betroffenen Spieler laden
    const { data: dutiesToDelete, error: selectError } = await supabase
      .from("wash_duties")
      .select("assigned_to")
      .eq("game_day", gameDay);

    if (selectError) {
      console.error("Fehler beim Abrufen vor Löschung:", selectError);
      toast.error("Fehler beim Löschen des Spieltags");
      return;
    }

    // Waschzähler aller betroffenen Spieler reduzieren
    for (const duty of dutiesToDelete || []) {
      if (duty.assigned_to) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("wash_count")
          .eq("user_id", duty.assigned_to)
          .single();

        if (currentProfile) {
          await supabase
            .from("profiles")
            .update({
              wash_count: Math.max(0, (currentProfile.wash_count || 0) - 1),
            })
            .eq("user_id", duty.assigned_to);
        }
      }
    }

    // Spieltag löschen
    const { error } = await supabase
      .from("wash_duties")
      .delete()
      .eq("game_day", gameDay);

    if (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Fehler beim Löschen des Spieltags");
      return;
    }

    toast.success("Spieltag gelöscht");
    refetch();
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Input
              placeholder="Spieltag (z.B. 15. Spieltag)"
              value={newGameDay}
              onChange={(e) => setNewGameDay(e.target.value)}
            />
            <Input
              type="date"
              value={newGameDate}
              onChange={(e) => setNewGameDate(e.target.value)}
            />
            <Button onClick={handleAddGameDay} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Spieltag hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      {(!washDuties || washDuties.length === 0) ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Noch keine Spieltage eingetragen
          </CardContent>
        </Card>
      ) : (
        washDuties.map((duty) => (
          <Card key={duty.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-semibold">{duty.game_day}</h3>
                  {duty.game_date && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(duty.game_date), "PPP", { locale: de })}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteGameDay(duty.game_day)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {duty.assigned_to ? (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span>🧺 {duty.profile?.full_name || "Unbekannt"}</span>
                  {(duty.assigned_to === user?.id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(duty.game_day, duty.assigned_to)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                    onClick={() => handleAssign(duty.game_day)}
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
                        className="w-full"
                        onClick={() =>
                          selectedUserId &&
                          handleAssign(duty.game_day, selectedUserId)
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
        ))
      )}
    </div>
  );
};

export default WashList;
