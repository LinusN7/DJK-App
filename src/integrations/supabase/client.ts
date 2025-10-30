console.log("🔍 SUPABASE ENV CHECK:", {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10) + "...",
});


import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase"; // ✅ neu

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);


// 🧩 Hilfsfunktion: "flache" Typen (verhindert Deep-Type-Recursion)
export const sb = {
  from: <T extends keyof Database["public"]["Tables"]>(table: T) =>
    supabase.from(table) as any, // flacher Cast
};

// Temporär für Debugging:
;(window as any).supabase = supabase