import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolvePriceListIdForUser } from "@/lib/pricing";
import ProductDetailClient from "@/components/shop/ProductDetailClient";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const listaPrecioId = await resolvePriceListIdForUser(supabase, user?.id);

  const { data: product } = await supabase
    .from("products")
    .select("id,name,description,image_url,category,stock,price")
    .eq("id", id)
    .single();

  if (!product) {
    notFound();
  }

  let displayPrice = Number(product.price ?? 0);

  if (listaPrecioId) {
    const { data: specificPrice } = await supabase
      .from("product_prices")
      .select("price")
      .eq("lista_precio_id", listaPrecioId)
      .eq("product_id", product.id)
      .single();

    if (specificPrice?.price != null) {
      displayPrice = Number(specificPrice.price);
    }
  }

  return <ProductDetailClient product={{ ...product, display_price: displayPrice }} />;
}
