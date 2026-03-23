"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

export type BankAccount = {
  id: string;
  label: string;
  bank_name: string;
  account_holder: string | null;
  cbu: string;
  alias: string;
  cuit: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

async function requireStaff() {
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
  const role = (profile?.role as string | undefined) ?? (isAdminEmail ? "admin_carpi" : undefined);

  if (!role || !STAFF_ROLES.includes(role)) {
    throw new Error("Sin permisos para gestionar cuentas bancarias.");
  }
}

function normalizeText(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  const compact = value.trim();
  return compact.length ? compact : fallback;
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  await requireStaff();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("transfer_bank_accounts")
    .select("id,label,bank_name,account_holder,cbu,alias,cuit,is_active,display_order,created_at,updated_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BankAccount[];
}

export async function createBankAccount(input: {
  label: string;
  bank_name: string;
  account_holder?: string | null;
  cbu: string;
  alias: string;
  cuit: string;
  is_active?: boolean;
  display_order?: number;
}) {
  await requireStaff();
  const admin = createAdminClient();

  const payload = {
    label: normalizeText(input.label),
    bank_name: normalizeText(input.bank_name),
    account_holder: normalizeText(input.account_holder ?? "") || null,
    cbu: normalizeText(input.cbu),
    alias: normalizeText(input.alias),
    cuit: normalizeText(input.cuit),
    is_active: input.is_active ?? true,
    display_order: Number.isFinite(input.display_order) ? Number(input.display_order) : 0,
  };

  if (!payload.label || !payload.bank_name || !payload.cbu || !payload.alias || !payload.cuit) {
    throw new Error("Completa etiqueta, banco, CBU, alias y CUIT.");
  }

  const { error } = await admin.from("transfer_bank_accounts").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cuentas-bancarias");
  return { ok: true };
}

export async function updateBankAccount(input: {
  id: string;
  label: string;
  bank_name: string;
  account_holder?: string | null;
  cbu: string;
  alias: string;
  cuit: string;
  is_active: boolean;
  display_order: number;
}) {
  await requireStaff();
  const admin = createAdminClient();

  if (!input.id) {
    throw new Error("ID requerido.");
  }

  const payload = {
    label: normalizeText(input.label),
    bank_name: normalizeText(input.bank_name),
    account_holder: normalizeText(input.account_holder ?? "") || null,
    cbu: normalizeText(input.cbu),
    alias: normalizeText(input.alias),
    cuit: normalizeText(input.cuit),
    is_active: Boolean(input.is_active),
    display_order: Number.isFinite(input.display_order) ? Number(input.display_order) : 0,
  };

  if (!payload.label || !payload.bank_name || !payload.cbu || !payload.alias || !payload.cuit) {
    throw new Error("Completa etiqueta, banco, CBU, alias y CUIT.");
  }

  const { error } = await admin.from("transfer_bank_accounts").update(payload).eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cuentas-bancarias");
  return { ok: true };
}

export async function deleteBankAccount(id: string) {
  await requireStaff();
  const admin = createAdminClient();

  if (!id) {
    throw new Error("ID requerido.");
  }

  const { error } = await admin.from("transfer_bank_accounts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/cuentas-bancarias");
  return { ok: true };
}
