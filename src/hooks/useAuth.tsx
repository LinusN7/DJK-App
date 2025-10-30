import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// =============================================================
// 🔹 useAuth Hook
// =============================================================
export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // Profil laden
  // -------------------------------------------------------------
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      if (!data) {
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      setProfile(data);
      setIsAdmin(data.role === "admin");
    } catch (err) {
      console.error("❌ Fehler beim Laden des Profils:", err);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Auth-Zustand überwachen
  // -------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const init = async () => {
      // 1️⃣ Aktuelle Session prüfen
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user && active) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
        return;
      }

      // 2️⃣ Listener auf Änderungen
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!active) return;
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  // -------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  // -------------------------------------------------------------
  return {
    user,
    profile,
    isAdmin,
    loading,
    signOut,
  };
};

// =============================================================
// 🔹 Context & Provider
// =============================================================
interface AuthContextType {
  user: any;
  profile: any;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext muss innerhalb von <AuthProvider> verwendet werden!");
  }
  return context;
};
