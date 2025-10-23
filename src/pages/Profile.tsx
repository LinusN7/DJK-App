import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // 🗑️ Account löschen
  const handleDeleteAccount = async () => {
    if (!confirm("Willst du deinen Account wirklich dauerhaft löschen?")) return;

    try {
      const { error } = await supabase.rpc("delete_user_and_data");

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
    <div className="flex flex-col items-center p-6 space-y-6 w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Profil</h1>

      <form onSubmit={handleSave} className="w-full space-y-3">
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Speichern..." : "Änderungen speichern"}
        </Button>
      </form>

      <div className="w-full flex flex-col gap-2">
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
