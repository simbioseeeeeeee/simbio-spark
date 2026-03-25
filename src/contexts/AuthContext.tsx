import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type AppRole = "sdr" | "closer" | "manager";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  userName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  userName: "",
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
    if (!error && data) {
      setRole(data as AppRole);
      // Also fetch the name
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("nome")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (roleData) setUserName((roleData as any).nome || "");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
      } else {
        setRole(null);
        setUserName("");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setUserName("");
  };

  return (
    <AuthContext.Provider value={{ user, role, userName, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
