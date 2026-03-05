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

function normalizeProfile(input: Partial<Profile> | null | undefined, fallbackUserId: string, fallbackEmail: string | null): Profile {
  return {
    id: input?.id ?? fallbackUserId,
    email: input?.email ?? fallbackEmail,
    full_name: input?.full_name ?? null,
    role: input?.role ?? "usuario",
    parent_id: input?.parent_id ?? null,
    lista_precio_id: typeof input?.lista_precio_id === "number" ? input.lista_precio_id : null,
    can_view_team_orders: Boolean(input?.can_view_team_orders),
  };
}

function getErrorMessage(caughtError: unknown): string {
  if (caughtError instanceof Error && caughtError.message) {
    return caughtError.message;
  }

  if (typeof caughtError === "object" && caughtError !== null) {
    const maybeMessage = (caughtError as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }

  return "Error al cargar perfil";
}

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
        .select("id,email,role,parent_id,lista_precio_id,can_view_team_orders")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      let resolvedProfile: Profile | null = myProfile
        ? normalizeProfile(myProfile, user.id, user.email ?? null)
        : null;

      if (profileError) {
        const profileErrorMessage = profileError.message ?? "";
        const hasProfilesRlsRecursion =
          profileError.code === "42P17" ||
          profileErrorMessage.toLowerCase().includes("infinite recursion") ||
          profileErrorMessage.toLowerCase().includes("policy for relation \"profiles\"");
        const shouldTryLegacySelect =
          profileErrorMessage.includes("can_view_team_orders") ||
          profileErrorMessage.includes("lista_precio_id") ||
          profileErrorMessage.includes("parent_id") ||
          profileErrorMessage.includes("column");

        if (hasProfilesRlsRecursion) {
          resolvedProfile = normalizeProfile(null, user.id, user.email ?? null);
        } else if (shouldTryLegacySelect) {
          const { data: legacyProfile, error: legacyError } = await supabase
            .from("profiles")
            .select("id,email,role")
            .eq("id", user.id)
            .maybeSingle<Pick<Profile, "id" | "email" | "role">>();

          if (legacyError) {
            throw legacyError;
          }

          resolvedProfile = legacyProfile
            ? normalizeProfile(legacyProfile as Partial<Profile>, user.id, user.email ?? null)
            : null;
        } else {
          throw profileError;
        }
      }

      if (!resolvedProfile) {
        const { data: createdProfile, error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email ?? null,
            role: "usuario",
          })
          .select("id,email,role,parent_id,lista_precio_id,can_view_team_orders")
          .maybeSingle<Profile>();

        if (createProfileError) {
          const createErrorMessage = createProfileError.message ?? "";
          const canFallbackToSessionProfile =
            createErrorMessage.includes("policy") ||
            createErrorMessage.includes("permission") ||
            createErrorMessage.includes("column");

          if (!canFallbackToSessionProfile) {
            throw createProfileError;
          }

          resolvedProfile = normalizeProfile(null, user.id, user.email ?? null);
        } else {
          resolvedProfile = normalizeProfile(createdProfile ?? null, user.id, user.email ?? null);
        }
      }

      if (!resolvedProfile) {
        resolvedProfile = normalizeProfile(null, user.id, user.email ?? null);
      }

      setProfile(resolvedProfile);

      if (resolvedProfile.parent_id) {
        const { data: parent, error: parentError } = await supabase
          .from("profiles")
          .select("id,full_name,lista_precio_id")
          .eq("id", resolvedProfile.parent_id)
          .maybeSingle<Pick<Profile, "id" | "full_name" | "lista_precio_id">>();

        if (parentError) {
          const parentErrorMessage = parentError.message ?? "";
          const canIgnoreParentError =
            parentErrorMessage.includes("lista_precio_id") ||
            parentErrorMessage.includes("column");

          if (!canIgnoreParentError) {
            throw parentError;
          }

          setParentProfile(null);
        } else {
          setParentProfile(parent ?? null);
        }
      } else {
        setParentProfile(null);
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
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
