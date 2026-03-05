"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function requireFabricante() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "fabricante") {
    throw new Error("Solo fabricantes pueden gestionar su equipo.");
  }

  return { user };
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TeamMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  can_view_team_orders: boolean;
  is_active: boolean;
};

/* ------------------------------------------------------------------ */
/*  List                                                               */
/* ------------------------------------------------------------------ */

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { user } = await requireFabricante();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,can_view_team_orders,is_active")
    .eq("parent_id", user.id)
    .eq("role", "usuario")
    .order("is_active", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    can_view_team_orders: Boolean(row.can_view_team_orders),
    is_active: row.is_active !== false,
  }));
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

export async function createTeamMember(input: {
  email: string;
  password: string;
  full_name: string;
}) {
  const { user } = await requireFabricante();
  const admin = createAdminClient();

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email requerido.");
  if (!input.password || input.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  // Create auth user
  const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createError || !createdAuth.user?.id) {
    throw new Error(createError?.message || "No se pudo crear el usuario.");
  }

  const userId = createdAuth.user.id;

  // Create profile linked to this fabricante
  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: input.full_name.trim() || null,
      role: "usuario",
      parent_id: user.id,
      is_active: true,
      can_view_team_orders: false,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    // Rollback: delete the auth user we just created
    await admin.auth.admin.deleteUser(userId);
    throw new Error(upsertError.message);
  }

  revalidatePath("/dashboard/equipo");
  return { ok: true, id: userId };
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */

export async function updateTeamMember(input: {
  id: string;
  full_name?: string;
  can_view_team_orders?: boolean;
  is_active?: boolean;
}) {
  const { user } = await requireFabricante();
  const admin = createAdminClient();

  if (!input.id) throw new Error("ID requerido.");

  // Verify the target user belongs to this fabricante
  const { data: target } = await admin
    .from("profiles")
    .select("id,parent_id")
    .eq("id", input.id)
    .single();

  if (!target || target.parent_id !== user.id) {
    throw new Error("No tienes permisos sobre este usuario.");
  }

  const payload: Record<string, unknown> = {};
  if (input.full_name !== undefined) payload.full_name = input.full_name.trim() || null;
  if (input.can_view_team_orders !== undefined) payload.can_view_team_orders = input.can_view_team_orders;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (Object.keys(payload).length === 0) return { ok: true };

  const { error } = await admin.from("profiles").update(payload).eq("id", input.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/equipo");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export async function deleteTeamMember(id: string) {
  const { user } = await requireFabricante();
  const admin = createAdminClient();

  if (!id) throw new Error("ID requerido.");

  // Verify ownership
  const { data: target } = await admin
    .from("profiles")
    .select("id,parent_id")
    .eq("id", id)
    .single();

  if (!target || target.parent_id !== user.id) {
    throw new Error("No tienes permisos sobre este usuario.");
  }

  // Delete from auth (cascade will remove profile via FK)
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);

  // Ensure profile row is also gone
  await admin.from("profiles").delete().eq("id", id);

  revalidatePath("/dashboard/equipo");
  return { ok: true };
}
