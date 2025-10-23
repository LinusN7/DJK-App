import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { toast } from "sonner";

interface DriversListProps {
  gameId: string;
  onUpdate: () => void;
}

const DriversList = ({ gameId, onUpdate }: DriversListProps) => {
  const { user, isAdmin } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPassenger, setCurrentPassenger] = useState<string | null>(null);

  // 🚗 Fahrer + Mitfahrer abrufen
  const fetchDrivers = async () => {
    setLoading(true);

  // Fahrer abrufen
  const { data: driversData, error: driversError } = await supabase
    .from("drivers")
    .select(`
      id,
      game_id,
      user_id,
      location,
      departure_time,
      seats,
      created_at,
      profiles!drivers_user_id_fkey (full_name)
    `)
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

    if (driversError) {
      console.error(driversError);
      toast.error("Fehler beim Laden der Fahrer");
      setLoading(false);
      return;
    }

    // Fahrer-IDs sammeln
    const driverIds = driversData.map((d) => d.id);
    if (driverIds.length === 0) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    // Passagiere abrufen
    const { data: passengersData, error: passengersError } = await supabase
      .from("passengers")
      .select("id, driver_id, user_id, profiles(full_name)")
      .in("driver_id", driverIds);

    if (passengersError) {
      console.error(passengersError);
      toast.error("Fehler beim Laden der Mitfahrer");
      setLoading(false);
      return;
    }

    // Aktuellen Nutzerstatus prüfen (ob er irgendwo mitfährt)
    const myPassenger = passengersData?.find((p) => p.user_id === user?.id);
    setCurrentPassenger(myPassenger ? myPassenger.driver_id : null);

    // Fahrer mit Mitfahrern kombinieren
    const driverMap = driversData.map((driver) => ({
      ...driver,
      passengers:
        passengersData?.filter((p) => p.driver_id === driver.id) || [],
    }));

    setDrivers(driverMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, [gameId]);

  // 👤 Spieler als Mitfahrer eintragen
  const handleJoin = async (driverId: string) => {
    if (!user) return;

    // prüfen, ob Spieler bereits irgendwo Mitfahrer ist
    const { data: existingPassenger } = await supabase
      .from("passengers")
      .select("id, driver_id")
      .eq("user_id", user.id)
      .single();

    if (existingPassenger) {
      toast.error("Du bist bereits bei einem Fahrer eingetragen");
      return;
    }

    // Sitzplatz prüfen
    const driver = drivers.find((d) => d.id === driverId);
    if (driver.passengers.length >= driver.seats) {
      toast.error("Keine Sitzplätze mehr verfügbar");
      return;
    }

    const { error } = await supabase
      .from("passengers")
      .insert([{ driver_id: driverId, user_id: user.id }]);

    if (error) {
      console.error(error);
      toast.error("Fehler beim Eintragen");
      return;
    }

    toast.success("Du wurdest als Mitfahrer eingetragen 🚙");
    fetchDrivers();
    onUpdate();
  };

  // ❌ Austragen (Mitfahrer)
  const handleLeave = async (passengerId: string) => {
    const { error } = await supabase
      .from("passengers")
      .delete()
      .eq("id", passengerId);

    if (error) {
      console.error(error);
      toast.error("Fehler beim Austragen");
      return;
    }

    toast.success("Du wurdest ausgetragen");
    fetchDrivers();
    onUpdate();
  };

  // 🧹 Admin entfernt Mitfahrer
  const handleRemovePassenger = async (passengerId: string) => {
    const { error } = await supabase
      .from("passengers")
      .delete()
      .eq("id", passengerId);

    if (error) {
      console.error(error);
      toast.error("Fehler beim Entfernen des Mitfahrers");
      return;
    }

    toast.success("Mitfahrer entfernt");
    fetchDrivers();
    onUpdate();
  };

  if (loading) {
    return <p className="text-muted-foreground text-center">Lädt Fahrer...</p>;
  }

  if (drivers.length === 0) {
    return <p className="text-muted-foreground text-center">Noch keine Fahrer</p>;
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver) => (
        <Card key={driver.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  🚗 {driver.profiles?.full_name || "Unbekannt"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {driver.location} • {driver.departure_time} • {driver.seats} Sitzplätze
                </p>
              </div>
            </div>

            {/* Mitfahrer */}
            <div className="space-y-1">
              {driver.passengers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Mitfahrer
                </p>
              ) : (
                driver.passengers.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-sm border rounded-lg px-2 py-1"
                  >
                    <span>👤 {p.profiles?.full_name || "Unbekannt"}</span>
                    {(p.user_id === user?.id || isAdmin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          p.user_id === user?.id
                            ? handleLeave(p.id)
                            : handleRemovePassenger(p.id)
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Mitfahrer hinzufügen */}
            {currentPassenger === null && driver.passengers.length < driver.seats && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleJoin(driver.id)}
              >
                Als Mitfahrer eintragen
              </Button>
            )}

            {currentPassenger === driver.id && (
              <p className="text-xs text-center text-muted-foreground">
                ✅ Du bist bei diesem Fahrer eingetragen
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DriversList;
