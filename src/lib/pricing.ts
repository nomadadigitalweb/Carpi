import { SupabaseClient } from "@supabase/supabase-js";

type ProfilePriceLookup = {
  role: string | null;
  parent_id: string | null;
  lista_precio_id: number | null;
};

export async function resolvePriceListIdForUser(
  supabase: SupabaseClient,
  userId?: string
): Promise<number | null> {
  if (!userId) {
    return null;
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role,parent_id,lista_precio_id")
    .eq("id", userId)
    .single<Pick<ProfilePriceLookup, "role" | "parent_id" | "lista_precio_id">>();

  if (!myProfile) return null;

  // Fabricante: use their own lista_precio_id directly
  if (myProfile.role === "fabricante") {
    return myProfile.lista_precio_id ?? null;
  }

  // Usuario: look up parent fabricante's lista_precio_id
  if (!myProfile.parent_id) {
    return null;
  }

  const { data: fabricante } = await supabase
    .from("profiles")
    .select("lista_precio_id")
    .eq("id", myProfile.parent_id)
    .single<Pick<ProfilePriceLookup, "lista_precio_id">>();

  return fabricante?.lista_precio_id ?? null;
}
