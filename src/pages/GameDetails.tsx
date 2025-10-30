import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [departureLocation, setDepartureLocation] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState<number | "">("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  // 📦 Spiel, Fahrer und Mitfahrer laden
  const fetchGameData = async () => {
    try {
      setLoading(true);

      // Spiel abrufen
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .single();

      if (gameError || !gameData) throw new Error("Fehler beim Laden des Spiels");
      setGame(gameData);

      // Fahrer abrufen
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(`
          id,
          game_id,
          user_id,
          departure_location,
          departure_time,
          seats_available,
          created_at,
          profiles!drivers_user_id_fkey (full_name)
        `)
        .eq("game_id", id)
        .order("created_at", { ascending: true });

      if (driverError) throw new Error("Fehler beim Laden der Fahrer");
      setDrivers(driverData || []);

      // Mitfahrer abrufen
      if (driverData && driverData.length > 0) {
        const { data: passengerData, error: passengerError } = await supabase
          .from("passengers")
          .select(`
            id,
            driver_id,
            user_id,
            profiles!passengers_user_id_fkey (full_name)
          `)
          .in("driver_id", driverData.map((d) => d.id));

        if (passengerError) throw new Error("Fehler beim Laden der Mitfahrer");
        setPassengers(passengerData || []);
      } else {
        setPassengers([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Spieler abrufen (nur für Admin)
  const fetchAllPlayers = async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name");
    if (!error && data) setAllPlayers(data);
  };

  useEffect(() => {
    if (id) fetchGameData();
    if (isAdmin) fetchAllPlayers();
  }, [id, isAdmin]);

  // 🚗 Fahrer hinzufügen
  const handleAddDriver = async () => {
    if (!departureLocation.trim() || !departureTime.trim() || seatsAvailable === "") {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    if (!user) {
      toast.error("Bitte zuerst anmelden");
      return;
    }

    try {
      const { error } = await supabase.from("drivers").insert([
        {
          game_id: id,
          user_id: user.id,
          departure_location: departureLocation.trim(),
          departure_time: departureTime,
          seats_available: Number(seatsAvailable),
        },
      ]);
      if (error) throw error;

      toast.success("Fahrer hinzugefügt");
      setAddMode(false);
      setDepartureLocation("");
      setDepartureTime("");
      setSeatsAvailable("");
      await fetchGameData();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Hinzufügen");
    }
  };

  // ❌ Fahrer entfernen
  const handleRemoveDriver = async (driverId: string) => {
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", driverId);
      if (error) throw error;
      toast.success("Fahrer entfernt");
      await fetchGameData();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Entfernen");
    }
  };

  // 🧍‍♂️ Mitfahrer hinzufügen (jetzt auch Admin mit Auswahl)
  const handleAddPassenger = async (driverId: string, customUserId?: string) => {
    if (!user) {
      toast.error("Bitte zuerst anmelden");
      return;
    }

    const targetUserId = customUserId || user.id;

    const alreadyPassenger = passengers.find((p) => p.user_id === targetUserId);
    if (alreadyPassenger) {
      toast.error("Dieser Spieler ist bereits Mitfahrer");
      return;
    }

    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) {
      toast.error("Fahrer nicht gefunden");
      return;
    }

    if (driver.seats_available <= 0) {
      toast.error("Keine Sitzplätze mehr verfügbar");
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("passengers")
        .insert([{ driver_id: driverId, user_id: targetUserId }]);
      if (insertError) throw insertError;

      // 🧮 Sitzplätze per RPC-Funktion verringern
      const { error: rpcError } = await supabase.rpc("update_driver_seats", {
        p_driver_id: driverId,
        p_delta: -1,
      });
      if (rpcError) console.error("Fehler beim Reduzieren der Sitzplätze:", rpcError);

      toast.success("Mitfahrer hinzugefügt");
      setSelectedUserId("");
      await fetchGameData();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Eintragen als Mitfahrer");
    }
  };

  // ❌ Mitfahrer austragen (Admin darf alle löschen)
  const handleRemovePassenger = async (passengerId: string, driverId: string) => {
    try {
      const { error } = await supabase.from("passengers").delete().eq("id", passengerId);
      if (error) throw error;

      // 🧮 Sitzplätze per RPC-Funktion erhöhen
      const { error: rpcError } = await supabase.rpc("update_driver_seats", {
        p_driver_id: driverId,
        p_delta: 1,
      });
      if (rpcError) console.error("Fehler beim Erhöhen der Sitzplätze:", rpcError);

      toast.success("Mitfahrer entfernt");
      await fetchGameData();
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Entfernen");
    }
  };

  // 🗑️ Spiel löschen
  const handleDeleteGame = async () => {
    try {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
      toast.success("Spiel gelöscht");
      navigate("/games");
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Löschen des Spiels");
    }
  };

  // 📦 Render
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
            <Button variant="destructive" size="sm" onClick={handleDeleteGame}>
              <Trash2 className="h-4 w-4 mr-2" />
              Spiel löschen
            </Button>
          )}
        </div>
      </div>

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
              const driverPassengers = passengers.filter((p) => p.driver_id === driver.id);
              const currentPassenger = driverPassengers.find(
                (p) => p.user_id === user?.id
              );

              return (
                <div key={driver.id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">
                        🚗 {driver.profiles?.full_name || "Unbekannt"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {driver.departure_location} •{" "}
                        {driver.departure_time
                          ? `${driver.departure_time.slice(0, 5)} Uhr `
                          : "–"}
                        •{" "}
                        <strong>
                          {driver.seats_available}{" "}
                          {driver.seats_available === 1 ? "verfügbarer Sitzplatz" : "verfügbare Sitzplätze"}
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

                  {driverPassengers.length > 0 && (
                    <ul className="pl-4 list-disc text-sm text-muted-foreground">
                      {driverPassengers.map((p) => (
                        <li key={p.id}>
                          {p.profiles?.full_name || "Unbekannt"}
                          {(p.user_id === user?.id || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-red-500"
                              onClick={() => handleRemovePassenger(p.id, driver.id)}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* === Neue Logik: Mitfahrer hinzufügen === */}
                  {driver.seats_available > 0 && (
                    <>
                      {/* Spieler: selbst eintragen */}
                      {!currentPassenger && driver.user_id !== user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mb-2"
                          onClick={() => handleAddPassenger(driver.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Selbst eintragen
                        </Button>
                      )}

                      {/* Admin: Dropdown + Spieler eintragen */}
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
                              handleAddPassenger(driver.id, selectedUserId)
                            }
                            disabled={!selectedUserId}
                          >
                            Spieler eintragen
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}

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
                  value={departureLocation}
                  onChange={(e) => setDepartureLocation(e.target.value)}
                  placeholder="z.B. Vereinsheim"
                />
              </div>
              <div className="space-y-1">
                <Label>Abfahrtszeit</Label>
                <Input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Verfügbare Sitzplätze</Label>
                <Input
                  type="number"
                  min="1"
                  value={seatsAvailable}
                  onChange={(e) =>
                    setSeatsAvailable(e.target.value ? Number(e.target.value) : "")
                  }
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
