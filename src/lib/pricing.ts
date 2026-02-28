import { SupabaseClient } from "@supabase/supabase-js";

type ProfilePriceLookup = {
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
    .select("parent_id")
    .eq("id", userId)
    .single<Pick<ProfilePriceLookup, "parent_id">>();

  if (!myProfile?.parent_id) {
    return null;
  }

  const { data: fabricante } = await supabase
    .from("profiles")
    .select("lista_precio_id")
    .eq("id", myProfile.parent_id)
    .single<Pick<ProfilePriceLookup, "lista_precio_id">>();

  return fabricante?.lista_precio_id ?? null;
}
