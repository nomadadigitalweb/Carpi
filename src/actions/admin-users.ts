"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

export type ManagedRole = "usuario" | "fabricante";

export type ManagedProfile = {
  id: string;
  email: string | null;
  role: ManagedRole;
  parent_id: string | null;
  lista_precio_id: number | null;
  can_view_team_orders: boolean;
  is_active: boolean;
  updated_at?: string | null;
};

async function requireAdminCarpi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminEmail = user.email?.toLowerCase() === "admin@carpi.com";
  if (profile?.role !== "admin_carpi" && !isAdminEmail) {
    throw new Error("Sin permisos para gestionar usuarios.");
  }

  return { user };
}

export async function listManagedProfiles() {
  await requireAdminCarpi();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,role,parent_id,lista_precio_id,can_view_team_orders,is_active,updated_at")
    .in("role", ["usuario", "fabricante"])
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as ManagedProfile[]).map((row) => ({
    ...row,
    can_view_team_orders: Boolean(row.can_view_team_orders),
    is_active: row.is_active !== false,
  }));

  const fabricantes = rows.filter((row) => row.role === "fabricante");
  const usuarios = rows.filter((row) => row.role === "usuario");

  return { usuarios, fabricantes };
}

export async function createManagedAccount(input: {
  email: string;
  password: string;
  role: ManagedRole;
  parent_id?: string | null;
  lista_precio_id?: number | null;
  can_view_team_orders?: boolean;
  is_active?: boolean;
}) {
  await requireAdminCarpi();
  const admin = createAdminClient();

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email requerido.");
  if (!input.password || input.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  if (input.role === "usuario" && !input.parent_id) {
    throw new Error("Debes asignar un fabricante al usuario.");
  }

  const { data: createdAuth, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createUserError || !createdAuth.user?.id) {
    throw new Error(createUserError?.message || "No se pudo crear el usuario en auth.");
  }

  const userId = createdAuth.user.id;

  const profilePayload = {
    id: userId,
    email,
    role: input.role,
    parent_id: input.role === "usuario" ? (input.parent_id ?? null) : null,
    lista_precio_id: input.role === "fabricante" ? (input.lista_precio_id ?? null) : null,
    can_view_team_orders: input.role === "usuario" ? Boolean(input.can_view_team_orders) : false,
    is_active: input.is_active ?? true,
  };

  const { error: upsertError } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (upsertError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(upsertError.message);
  }

  revalidatePath("/admin/usuarios");
  return { ok: true, id: userId };
}

export async function updateManagedProfile(input: {
  id: string;
  role: ManagedRole;
  parent_id?: string | null;
  lista_precio_id?: number | null;
  can_view_team_orders?: boolean;
  is_active?: boolean;
}) {
  await requireAdminCarpi();
  const admin = createAdminClient();

  if (!input.id) throw new Error("ID requerido.");
  if (input.role === "usuario" && !input.parent_id) {
    throw new Error("Debes asignar un fabricante al usuario.");
  }

  const updatePayload = {
    role: input.role,
    parent_id: input.role === "usuario" ? (input.parent_id ?? null) : null,
    lista_precio_id: input.role === "fabricante" ? (input.lista_precio_id ?? null) : null,
    can_view_team_orders: input.role === "usuario" ? Boolean(input.can_view_team_orders) : false,
    is_active: input.is_active ?? true,
  };

  const { error } = await admin.from("profiles").update(updatePayload).eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deleteManagedAccount(id: string) {
  await requireAdminCarpi();
  const admin = createAdminClient();

  if (!id) throw new Error("ID requerido.");

  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) {
    throw new Error(authError.message);
  }

  await admin.from("profiles").delete().eq("id", id);

  revalidatePath("/admin/usuarios");
  return { ok: true };
}
