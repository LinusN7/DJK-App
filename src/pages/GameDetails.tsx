import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const GameDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [game, setGame] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("");

  // 🎯 Daten abrufen
  const fetchGameData = async () => {
    setLoading(true);

    const { data: gameData, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (gameError) {
      console.error(gameError);
      toast.error("Fehler beim Laden des Spiels");
      setLoading(false);
      return;
    }

    setGame(gameData);

    const { data: driverData, error: driverError } = await supabase
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
      .eq("game_id", id)
      .order("created_at", { ascending: true });

    if (driverError) {
      console.error(driverError);
      toast.error("Fehler beim Laden der Fahrer");
      setLoading(false);
      return;
    }

    setDrivers(driverData || []);

    const { data: passengerData, error: passengerError } = await supabase
      .from("passengers")
      .select(`
        id,
        driver_id,
        user_id,
        profiles!passengers_user_id_fkey (full_name)
      `)
      .in("driver_id", (driverData || []).map((d) => d.id));

    if (passengerError) {
      console.error(passengerError);
      toast.error("Fehler beim Laden der Mitfahrer");
    } else {
      setPassengers(passengerData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGameData();
  }, [id]);

  // 🚗 Fahrer hinzufügen
  const handleAddDriver = async () => {
    if (!location.trim() || !time.trim() || !seats) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    if (parseInt(seats, 10) < 0) {
      toast.error("Sitzplätze dürfen nicht negativ sein");
      return;
    }

    const { error } = await supabase.from("drivers").insert([
      {
        game_id: id,
        user_id: user!.id,
        location: location.trim(),
        departure_time: time,
        seats: parseInt(seats, 10),
      },
    ]);

    if (error) {
      console.error(error);
      toast.error("Fehler beim Hinzufügen");
      return;
    }

    toast.success("Fahrer hinzugefügt");
    setAddMode(false);
    setLocation("");
    setTime("");
    setSeats("");
    fetchGameData();
  };

  // ❌ Fahrer entfernen
  const handleRemoveDriver = async (driverId: string) => {
    const { error } = await supabase.from("drivers").delete().eq("id", driverId);
    if (error) {
      console.error(error);
      toast.error("Fehler beim Entfernen");
      return;
    }
    toast.success("Fahrer entfernt");
    fetchGameData();
  };

  // 🧍‍♂️ Mitfahrer hinzufügen (mit RPC Sitzplatzprüfung)
  const handleAddPassenger = async (driverId: string) => {
    const alreadyPassenger = passengers.find((p) => p.user_id === user!.id);
    if (alreadyPassenger) {
      toast.error("Du bist bereits Mitfahrer");
      return;
    }

    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) {
      toast.error("Fahrer nicht gefunden");
      return;
    }

    if (driver.seats <= 0) {
      toast.error("Keine Sitzplätze mehr verfügbar");
      return;
    }

    const { error: insertError } = await supabase.from("passengers").insert([
      { driver_id: driverId, user_id: user!.id },
    ]);

    if (insertError) {
      console.error(insertError);
      toast.error("Fehler beim Eintragen als Mitfahrer");
      return;
    }

    // 🔽 RPC: Sitzplätze -1
    const { error: rpcDecErr } = await supabase.rpc("update_driver_seats", {
      p_driver_id: driverId,
      p_delta: -1,
    });
    if (rpcDecErr) console.error("Fehler beim Reduzieren der Sitzplätze:", rpcDecErr);

    toast.success("Du bist jetzt Mitfahrer");
    fetchGameData();
  };

  // ❌ Mitfahrer austragen
  const handleRemovePassenger = async (passengerId: string, driverId: string) => {
    const { error } = await supabase
      .from("passengers")
      .delete()
      .eq("id", passengerId);

    if (error) {
      console.error(error);
      toast.error("Fehler beim Entfernen");
      return;
    }

    // 🔼 RPC: Sitzplätze +1
    const { error: rpcIncErr } = await supabase.rpc("update_driver_seats", {
      p_driver_id: driverId,
      p_delta: 1,
    });
    if (rpcIncErr) console.error("Fehler beim Erhöhen der Sitzplätze:", rpcIncErr);

    toast.success("Du wurdest als Mitfahrer entfernt");
    fetchGameData();
  };

  // 🗑️ Spiel löschen (nur Admin)
  const handleDeleteGame = async () => {
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Fehler beim Löschen des Spiels");
      return;
    }
    toast.success("Spiel gelöscht");
    navigate("/games");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center text-muted-foreground">
        Lädt Spielinformationen...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mx-auto p-4 text-center text-muted-foreground">
        Spiel nicht gefunden
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Kopfbereich */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{game.opponent}</h1>
          {game.game_date && (
            <p className="text-muted-foreground mt-1">
              {format(new Date(game.game_date), "PPP", { locale: de })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/games")}>
            ← Zurück zur Übersicht
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteGame}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Spiel löschen
            </Button>
          )}
        </div>
      </div>

      {/* Fahrerübersicht */}
      <Card>
        <CardHeader>
          <CardTitle>Fahrer & Mitfahrer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {drivers.length === 0 ? (
            <p className="text-muted-foreground text-center">
              Noch keine Fahrer eingetragen
            </p>
          ) : (
            drivers.map((driver) => {
              const driverPassengers = passengers.filter(
                (p) => p.driver_id === driver.id
              );
              const currentPassenger = driverPassengers.find(
                (p) => p.user_id === user?.id
              );

              return (
                <div
                  key={driver.id}
                  className="border rounded-lg p-3 space-y-2 bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">
                        🚗 {driver.profiles?.full_name || "Unbekannt"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {driver.location} • {driver.departure_time} •{" "}
                        <strong>
                          {driver.seats} zusätzlich verfügbare Sitzplätze
                        </strong>
                      </p>
                    </div>

                    {(isAdmin || driver.user_id === user?.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDriver(driver.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Mitfahrer-Liste */}
                  {driverPassengers.length > 0 && (
                    <ul className="pl-4 list-disc text-sm text-muted-foreground">
                      {driverPassengers.map((p) => (
                        <li key={p.id}>
                          {p.profiles?.full_name || "Unbekannt"}
                          {p.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-red-500"
                              onClick={() =>
                                handleRemovePassenger(p.id, driver.id)
                              }
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Button: Mitfahrer hinzufügen */}
                  {!currentPassenger &&
                    driver.user_id !== user?.id &&
                    driver.seats > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddPassenger(driver.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Als Mitfahrer eintragen
                      </Button>
                    )}
                </div>
              );
            })
          )}

          {/* Fahrer hinzufügen */}
          {!addMode ? (
            <Button className="w-full" onClick={() => setAddMode(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Als Fahrer anbieten
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Abfahrtsort</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="z.B. Vereinsheim"
                />
              </div>
              <div className="space-y-1">
                <Label>Abfahrtszeit</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Zusätzlich verfügbare Sitzplätze</Label>
                <Input
                  type="number"
                  min="1"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  placeholder="z.B. 4"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAddDriver}>
                  Speichern
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setAddMode(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GameDetails;
