import { createClient } from "@/utils/supabase/server";
import { resolvePriceListIdForUser } from "@/lib/pricing";
import ShopCatalogClient from "@/components/shop/ShopCatalogClient";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const listaPrecioId = await resolvePriceListIdForUser(supabase, user?.id);

  const { data: products } = await supabase
    .from("products")
    .select("id,name,image_url,stock,category,price")
    .eq("publication_status", "published")
    .order("name", { ascending: true });

  const productIds = (products ?? []).map((product) => product.id);
  const { data: priceRows } = listaPrecioId
    ? await supabase
        .from("product_prices")
        .select("product_id,price")
        .eq("lista_precio_id", listaPrecioId)
        .in("product_id", productIds)
    : { data: null };

  const priceByProductId = new Map((priceRows ?? []).map((price) => [price.product_id, Number(price.price)]));

  const resolvedProducts = (products ?? []).map((product) => ({
    ...product,
    display_price: priceByProductId.get(product.id) ?? Number(product.price ?? 0),
  }));

  return <ShopCatalogClient products={resolvedProducts} />;
}
