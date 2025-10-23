import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email({ message: "Bitte gib eine gültige E-Mail-Adresse ein" }),
  password: z.string().min(6, { message: "Passwort muss mindestens 6 Zeichen lang sein" }),
});

const signupSchema = z.object({
  email: z.string().email({ message: "Bitte gib eine gültige E-Mail-Adresse ein" }),
  password: z.string().min(6, { message: "Passwort muss mindestens 6 Zeichen lang sein" }),
  fullName: z.string().min(2, { message: "Name muss mindestens 2 Zeichen lang sein" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  // 📋 Teams Dropdown vorbereiten
  useEffect(() => {
    setTeams([
      { id: "erste", name: "Erste" },
      { id: "zweite", name: "Zweite" },
      { id: "dritte", name: "Dritte" },
    ]);
  }, []);

  // 🔑 Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Ungültige E-Mail oder Passwort");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Bitte bestätige zuerst deine E-Mail-Adresse");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Erfolgreich angemeldet!");
      navigate("/");
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
      const selectedTeamName = teams.find((t) => t.id === teamId)?.name ?? "Unbekannt";

      if (data.user) {
        // 🧩 Warte kurz, bis Session gesetzt ist
        await new Promise((r) => setTimeout(r, 500));

        // Profil erstellen
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            user_id: data.user.id,
            full_name: validated.fullName,
            team: selectedTeamName,
          },
        ]);

        if (profileError) {
          console.error("Fehler beim Erstellen des Profils:", profileError);
        } else {
          console.log("Profil erfolgreich erstellt für", validated.fullName);
        }

        // Rolle setzen
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "player" });

        if (roleError) {
          console.error("Fehler beim Setzen der Rolle:", roleError);
        }
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

  // 🧱 UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Team Fußball App</CardTitle>
          <CardDescription className="text-center">
            Organisiere Fahrten, Listen und mehr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            {/* 🔑 Login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Lädt..." : "Anmelden"}
                </Button>
              </form>
            </TabsContent>

            {/* 🧾 Registrierung */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Vollständiger Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Max Mustermann"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={teamId} onValueChange={setTeamId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Team auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-Mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passwort</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Lädt..." : "Registrieren"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
