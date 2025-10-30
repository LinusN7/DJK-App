import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

// ✅ Zod-Schema für Validierung
const signupSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail ein"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
  fullName: z.string().min(2, "Name ist zu kurz"),
});

const Auth = () => {
  const [tabValue, setTabValue] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 🧩 Teams laden
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name").order("name");
      if (error) { console.error("Teams-Query-Fehler:", error); }
      console.log("Teams-Query-Daten:", data);
      return data ?? [];
    },
  });

  // 🧾 Registrierung mit E-Mail-Bestätigung
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId) {
      toast.error("Bitte wähle ein Team aus");
      return;
    }

    try {
      const validated = signupSchema.parse({ email, password, fullName });
      setLoading(true);

      // 1️⃣ Registrierung starten – Supabase schickt automatisch Bestätigungs-Mail
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (
          error.message.includes("already registered") ||
          error.message.includes("User already registered")
        ) {
          toast.error("Dieser Account existiert bereits. Bitte einloggen.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // 2️⃣ Profil-Eintrag (Team & Name)
      const selectedTeamName = teams?.find((t) => t.id === teamId)?.name ?? "Unbekannt";

      const newUserId = data.user?.id ?? data.session?.user?.id;

      if (newUserId) {
        console.log("🧩 Neuer Benutzer wird angelegt:", newUserId);

        const { error: profileError } = await supabase.from("profiles").insert([
          {
            user_id: newUserId,
            full_name: validated.fullName,
            email: validated.email,
            team: selectedTeamName,
            team_id: teamId,
            role: "player",
          },
        ]);

        if (profileError) {
          console.error("❌ Fehler beim Erstellen des Profils:", profileError);
        } else {
          console.log("✅ Profil erfolgreich erstellt für", validated.fullName);
        }
      } else {
        console.warn("⚠️ Kein user_id nach Signup vorhanden, Profil nicht angelegt.");
      }

      // 3️⃣ Hinweis anzeigen & Tab umschalten
      toast.success("Registrierung erfolgreich! Bitte bestätige deine E-Mail, bevor du dich einloggst.");
      setTabValue("login");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Ein Fehler ist aufgetreten");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Erfolgreich eingeloggt!");
    } catch (error: any) {
      toast.error(error.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div className="max-w-md mx-auto py-10">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-center mb-4">
            <Button
              variant={tabValue === "login" ? "default" : "outline"}
              onClick={() => setTabValue("login")}
              className="mr-2"
            >
              Login
            </Button>
            <Button
              variant={tabValue === "signup" ? "default" : "outline"}
              onClick={() => setTabValue("signup")}
            >
              Registrieren
            </Button>
          </div>

          {tabValue === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Einloggen..." : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <Label htmlFor="fullName">Vollständiger Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="team">Team</Label>
                <select
                  id="team"
                  className="w-full border rounded-md p-2"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Team auswählen</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registriere..." : "Registrieren"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
