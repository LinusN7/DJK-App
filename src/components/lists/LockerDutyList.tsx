import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const LockerDutyList = () => {
  const { user, isAdmin } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Kabinendienste abrufen
  const { data: lockerDuties, refetch } = useQuery({
    queryKey: ["locker-duties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locker_duties")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(data.map((d) => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return data.map((duty) => ({
        ...duty,
        profile: profileMap.get(duty.assigned_to),
      }));
    },
  });

  // alle Spieler laden (für Admins)
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
    enabled: isAdmin,
  });

  // Neuen Zeitraum hinzufügen
  const handleAddWeek = async () => {
    if (!startDate || !endDate) {
      toast.error("Bitte Start- und Enddatum eingeben");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Startdatum muss vor Enddatum liegen");
      return;
    }

    const id = `${startDate}_${endDate}`;

    // prüfen, ob der Zeitraum schon existiert
    const { data: existing, error: checkError } = await supabase
      .from("locker_duties")
      .select("id")
      .eq("id", id)
      .limit(1);

    if (checkError) {
      console.error("Fehler bei Prüfung:", checkError);
      toast.error("Fehler beim Überprüfen");
      return;
    }

    if (existing && existing.length > 0) {
      toast.error("Dieser Zeitraum existiert bereits");
      return;
    }

    const { error } = await supabase.from("locker_duties").insert([
      {
        id,
        start_date: startDate,
        end_date: endDate,
        assigned_to: null,
      },
    ]);

    if (error) {
      console.error("Fehler beim Hinzufügen:", error);
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Zeitraum hinzugefügt");
    setStartDate("");
    setEndDate("");
    refetch();
  };

  // Spieler eintragen (neuer Datensatz für denselben Zeitraum)
  const handleAssign = async (duty: any, userId?: string) => {
    const targetUserId = userId || user!.id;
    const id = duty.id;

    // prüfen, ob Spieler bereits eingetragen ist
    const { data: existing } = await supabase
      .from("locker_duties")
      .select("assigned_to")
      .eq("id", id)
      .eq("assigned_to", targetUserId)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error("Spieler ist bereits eingetragen");
      return;
    }

    // prüfen, wie viele Spieler aktuell eingetragen sind
    const { count } = await supabase
      .from("locker_duties")
      .select("*", { count: "exact", head: true })
      .eq("id", id)
      .not("assigned_to", "is", null);

    if (count && count >= 3) {
      toast.error("Maximal 3 Spieler erlaubt");
      return;
    }

    // neuen Eintrag hinzufügen
    const { error } = await supabase.from("locker_duties").insert([
      {
        id,
        start_date: duty.start_date,
        end_date: duty.end_date,
        assigned_to: targetUserId,
      },
    ]);

    if (error) {
      console.error("Fehler beim Eintragen:", error);
      toast.error("Fehler beim Eintragen");
      return;
    }

    // Profil +1 Kabinendienst
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("locker_duty_count")
      .eq("user_id", targetUserId)
      .single();

    if (currentProfile) {
      await supabase
        .from("profiles")
        .update({
          locker_duty_count: (currentProfile.locker_duty_count || 0) + 1,
        })
        .eq("user_id", targetUserId);
    }

    toast.success("Eintrag erfolgreich");
    setSelectedUserId("");
    refetch();
  };

  // Spieler austragen
  const handleRemove = async (duty: any, userId: string) => {
    const { error } = await supabase
      .from("locker_duties")
      .delete()
      .eq("id", duty.id)
      .eq("assigned_to", userId);

    if (error) {
      console.error("Fehler beim Entfernen:", error);
      toast.error("Fehler beim Entfernen");
      return;
    }

    // Profil -1 Kabinendienst
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("locker_duty_count")
      .eq("user_id", userId)
      .single();

    if (currentProfile) {
      await supabase
        .from("profiles")
        .update({
          locker_duty_count: Math.max(
            0,
            (currentProfile.locker_duty_count || 0) - 1
          ),
        })
        .eq("user_id", userId);
    }

    toast.success("Eintrag entfernt");
    refetch();
  };

  // Gruppenbildung nach Zeitraum (id)
  const grouped = Array.from(
    lockerDuties?.reduce((acc: any, duty: any) => {
      if (!acc.has(duty.id)) acc.set(duty.id, []);
      acc.get(duty.id)!.push(duty);
      return acc;
    }, new Map()) || []
  );

  return (
    <div className="space-y-4">
      {/* Admin: neue Woche hinzufügen */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Von</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Bis</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddWeek} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Woche hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Noch keine Kabinendienste eingetragen
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([id, duties]) => (
          <Card key={id}>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">
                {format(new Date(duties[0].start_date), "PP", { locale: de })} –{" "}
                {format(new Date(duties[0].end_date), "PP", { locale: de })}
              </h3>

              {duties
                .filter((d: any) => d.assigned_to)
                .map((duty: any) => (
                  <div
                    key={duty.assigned_to}
                    className="flex items-center justify-between text-sm mb-1"
                  >
                    <span>🚪 {duty.profile?.full_name || "Unbekannt"}</span>
                    {(duty.assigned_to === user?.id || isAdmin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(duty, duty.assigned_to)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

              {duties.filter((d: any) => d.assigned_to).length < 3 && (
                <>
                  {/* Spieler kann sich selbst eintragen */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleAssign(duties[0])}
                  >
                    Selbst eintragen ({duties.filter((d: any) => d.assigned_to).length}/3)
                  </Button>

                  {/* Admin kann andere Spieler eintragen */}
                  {isAdmin && (
                    <div className="mt-3 space-y-2">
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
                          handleAssign(duties[0], selectedUserId)
                        }
                        disabled={!selectedUserId}
                      >
                        Spieler eintragen
                      </Button>
                    </div>
                  )}
                </>
              )}

              {duties.filter((d: any) => d.assigned_to).length >= 3 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Bereits voll belegt (3/3)
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default LockerDutyList;
