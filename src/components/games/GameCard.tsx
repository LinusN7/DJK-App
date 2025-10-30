import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car } from "lucide-react";


interface GameCardProps {
  game: any;
  onUpdate?: () => void; // optionaler Refresh
}

const GameCard = ({ game, onUpdate }: GameCardProps) => {
  // 🔹 Fahrer & Mitfahrer abrufen
  const { data: driversWithPassengers } = useQuery({
    queryKey: ["drivers", game.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          departure_location,
          departure_time,
          seats_available,
          profiles!drivers_user_id_fkey (full_name),
          passengers(
            id,
            profiles!passengers_user_id_fkey (full_name)
          )
        `)
        .eq("game_id", game.id);

      if (error) {
        console.error("Fehler beim Laden der Fahrer:", error);
        toast.error("Fehler beim Laden der Fahrer");
        return [];
      }

      return data || [];
    },
  });

  return (
    <Card className="cursor-pointer hover:shadow-md transition">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{game.opponent}</CardTitle>
        {game.game_date && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(game.game_date), "PPP", { locale: de })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {!driversWithPassengers || driversWithPassengers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">
            Noch keine Fahrer eingetragen
          </p>
        ) : (
          driversWithPassengers.map((driver: any) => (
            <div
              key={driver.id}
              className="border rounded-lg p-2 text-sm bg-gray-50"
            >
              <p className="font-medium">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-djk-green transform -scale-x-100" />
                  <h2 className="text-lg font-semibold">{game.opponent}</h2>
                </div>
                {driver.profiles?.full_name || "Unbekannt"}
              </p>
              <p className="text-muted-foreground">
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

              {driver.passengers?.length > 0 && (
                <ul className="pl-4 list-disc text-muted-foreground mt-1">
                  {driver.passengers.map((p: any) => (
                    <li key={p.id}>{p.profiles?.full_name || "Unbekannt"}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default GameCard;
