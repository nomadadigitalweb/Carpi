"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  parent_id: string | null;
  lista_precio_id: number | null;
  can_view_team_orders: boolean;
};

export function useSupabaseProfile() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [parentProfile, setParentProfile] = useState<Pick<Profile, "id" | "full_name" | "lista_precio_id"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setProfile(null);
        setParentProfile(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: myProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,parent_id,lista_precio_id,can_view_team_orders")
        .eq("id", user.id)
        .single<Profile>();

      if (profileError) {
        throw profileError;
      }

      setProfile(myProfile ?? null);

      if (myProfile?.parent_id) {
        const { data: parent, error: parentError } = await supabase
          .from("profiles")
          .select("id,full_name,lista_precio_id")
          .eq("id", myProfile.parent_id)
          .single<Pick<Profile, "id" | "full_name" | "lista_precio_id">>();

        if (parentError) {
          throw parentError;
        }

        setParentProfile(parent ?? null);
      } else {
        setParentProfile(null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return {
    supabase,
    userId,
    profile,
    parentProfile,
    loading,
    error,
    refreshProfile,
  };
}
