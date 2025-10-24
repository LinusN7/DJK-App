import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 Initial: Session holen
    const getSession = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Fehler beim Abrufen der Session:", error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    getSession();

    // 🔹 Listener für Auth-Änderungen
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🔹 Profil + Rolle laden
  type ProfileRow = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role")
        .eq("user_id", userId)
        .maybeSingle<ProfileRow>(); // 👈 Typ manuell angeben

      if (error) {
        console.error("Fehler beim Laden des Profils:", error);
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      if (!data) {
        console.warn("Kein Profil für Benutzer gefunden:", userId);
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      setProfile(data);
      setIsAdmin(data.role === "admin");
    } catch (err) {
      console.error("Unerwarteter Fehler beim Laden des Profils:", err);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };


  return {
    user,
    profile,
    isAdmin,
    loading,
  };
};
