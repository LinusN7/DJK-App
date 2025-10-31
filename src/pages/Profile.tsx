import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";


export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, team")
        .eq("user_id", user?.id)
        .single();

      if (error) console.error("Fehler beim Laden des Profils:", error);
      else {
        setFullName(data.full_name);
        setEmail(data.email);
        setTeamName(data.team); // 🟢 hier laden wir das Team
      }
    };

    if (user) fetchProfile();
  }, [user]);


  // 🧠 Profil-Daten laden
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Fehler beim Laden des Profils:", error);
        toast.error("Profil konnte nicht geladen werden");
      } else if (data) {
        setFullName(data.full_name ?? "");
        setEmail(user.email ?? "");
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  // 🔄 Änderungen speichern
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
      }

      if (password.trim() !== "") {
        const { error: pwError } = await supabase.auth.updateUser({
          password,
        });
        if (pwError) throw pwError;
      }

      toast.success("Profil erfolgreich aktualisiert!");
    } catch (error: any) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Änderungen konnten nicht gespeichert werden");
    } finally {
      setPassword("");
      setLoading(false);
    }
  };


  // 👇 Überwacht den Login-Status
  /* 
  useEffect(() => {
    if (user === null) {
      navigate("/auth", { replace: true });
    }
   }, [user, navigate]);
  */


  const handleLogout = async () => {
    await signOut(); // ← löst den Logout aus
    await new Promise((resolve) => setTimeout(resolve, 500)); // kurz warten
    navigate("/auth", { replace: true });
  };

  // 🗑️ Account löschen
  const handleDeleteAccount = async () => {
    if (!confirm("Willst du deinen Account wirklich dauerhaft löschen?")) return;

    try {
      const { error } = await supabase.rpc("delete_user_and_data");
      await fetch("https://wbnmwcmvzieqombnsgxn.functions.supabase.co/delete_user_and_data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });


      if (error) {
        console.error("Fehler beim Löschen des Accounts:", error);
        toast.error("Fehler beim Löschen des Accounts");
        return;
      }

      toast.success("Dein Account wurde gelöscht");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      console.error("Fehler beim Account-Löschen:", err);
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Lädt...</p>
      </div>
    );
  }

  return (
  <div className="container mx-auto p-4 pb-16">
    {/* Fixierter Header mit Logo */}
    <div className="w-full">
      <PageHeader title="Profil" />
    </div>

    <div className="w-full space-y-4 pb-4">
      <form onSubmit={handleSave} 
        className="w-full space-y-3">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">Team</Label>
          <Input
            id="team"
            type="text"
            value={teamName || "Kein Team zugewiesen"}
            disabled
            className="bg-gray-100 text-black cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Neues Passwort</Label>
          <Input
            id="password"
            type="password"
            value={password}
            placeholder="Leer lassen, um es nicht zu ändern"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-center pb-20">
          <Button 
            type="submit" 
            className="bg-djk-green hover:bg-djk-green/90 text-white" 
            disabled={loading}>
            {loading ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </div>
      </form>
    </div>

      <div className="w-full flex flex-col gap-3">
        <Button onClick={handleLogout} variant="outline" className="w-full">
          Abmelden
        </Button>

        <Button
          onClick={handleDeleteAccount}
          variant="destructive"
          className="w-full flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Account löschen
        </Button>
      </div>
  </div>
);
}
