import { createAdminClient } from "@/lib/supabase-admin";
import { syncXubioPriceLists, syncXubioProducts } from "@/lib/xubio";

type SyncResult = {
  entityType: "products" | "price_lists";
  status: "success" | "error";
  recordsSynced: number;
  errorDetail?: string;
};

type XubioProduct = {
  id: number;
  name: string;
  sku?: string | null;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  price?: number | null;
  stock?: number | null;
};

type XubioPriceRow = {
  product_external_id: number;
  lista_precio_id: number;
  price: number;
};

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidateKeys = ["items", "data", "results", "productos", "products", "price_lists", "listas", "prices"];
    for (const key of candidateKeys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
  }

  return [];
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeProducts(raw: unknown): XubioProduct[] {
  const rows = toArray<Record<string, unknown>>(raw);

  return rows
    .map((row): XubioProduct | null => {
      const id = parseNumber(row.id ?? row.product_id ?? row.articulo_id ?? row.external_id);
      const name = (row.name ?? row.nombre ?? row.description ?? row.descripcion) as string | undefined;

      if (!id || !name) {
        return null;
      }

      const skuRaw = row.sku ?? row.code ?? row.codigo;
      const descriptionRaw = row.description ?? row.descripcion;
      const imageRaw = row.image_url ?? row.imagen_url ?? row.image;
      const categoryRaw = row.category ?? row.categoria ?? row.linea;

      return {
        id,
        name,
        sku: typeof skuRaw === "string" ? skuRaw : undefined,
        description: typeof descriptionRaw === "string" ? descriptionRaw : undefined,
        image_url: typeof imageRaw === "string" ? imageRaw : undefined,
        category: typeof categoryRaw === "string" ? categoryRaw : undefined,
        price: parseNumber(row.price ?? row.public_price ?? row.precio_publico),
        stock: parseNumber(row.stock ?? row.available_stock ?? row.disponible),
      };
    })
    .filter((item): item is XubioProduct => item !== null);
}

function normalizePrices(raw: unknown): XubioPriceRow[] {
  const rows = toArray<Record<string, unknown>>(raw);
  const output: XubioPriceRow[] = [];

  for (const row of rows) {
    const listaId = parseNumber(row.lista_precio_id ?? row.price_list_id ?? row.id_lista ?? row.id);

    const nestedPrices = toArray<Record<string, unknown>>(row.prices ?? row.precios ?? row.items);

    if (nestedPrices.length && listaId) {
      for (const nestedRow of nestedPrices) {
        const productExternalId = parseNumber(
          nestedRow.product_external_id ?? nestedRow.product_id ?? nestedRow.articulo_id ?? nestedRow.id_articulo
        );
        const price = parseNumber(nestedRow.price ?? nestedRow.precio ?? nestedRow.unit_price);

        if (productExternalId && price !== null) {
          output.push({
            product_external_id: productExternalId,
            lista_precio_id: listaId,
            price,
          });
        }
      }
      continue;
    }

    const productExternalId = parseNumber(
      row.product_external_id ?? row.product_id ?? row.articulo_id ?? row.id_articulo
    );
    const price = parseNumber(row.price ?? row.precio ?? row.unit_price);

    if (productExternalId && listaId && price !== null) {
      output.push({
        product_external_id: productExternalId,
        lista_precio_id: listaId,
        price,
      });
    }
  }

  return output;
}

async function logSync(result: SyncResult) {
  const supabase = createAdminClient();
  await supabase.from("xubio_sync_log").insert({
    entity_type: result.entityType,
    records_synced: result.recordsSynced,
    status: result.status,
    error_detail: result.errorDetail ?? null,
  });
}

export async function runProductSync(): Promise<SyncResult> {
  try {
    const supabase = createAdminClient();
    const response = await syncXubioProducts();
    const products = normalizeProducts(response);

    if (products.length === 0) {
      const result: SyncResult = {
        entityType: "products",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const { error } = await supabase.from("products").upsert(
      products.map((product) => ({
        xubio_product_id: product.id,
        name: product.name,
        sku: product.sku ?? null,
        description: product.description ?? null,
        image_url: product.image_url ?? null,
        category: product.category ?? null,
        price: product.price ?? 0,
        stock: Math.max(0, Math.floor(product.stock ?? 0)),
      })),
      { onConflict: "xubio_product_id" }
    );

    if (error) {
      throw error;
    }

    const result: SyncResult = {
      entityType: "products",
      status: "success",
      recordsSynced: products.length,
    };
    await logSync(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      entityType: "products",
      status: "error",
      recordsSynced: 0,
      errorDetail: error instanceof Error ? error.message : "Unknown error",
    };
    await logSync(result);
    return result;
  }
}

export async function runPriceSync(): Promise<SyncResult> {
  try {
    const supabase = createAdminClient();
    const response = await syncXubioPriceLists();
    const rows = normalizePrices(response);

    if (rows.length === 0) {
      const result: SyncResult = {
        entityType: "price_lists",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const externalIds = Array.from(new Set(rows.map((row) => row.product_external_id)));

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id,xubio_product_id")
      .in("xubio_product_id", externalIds);

    if (productsError) {
      throw productsError;
    }

    const productIdByExternal = new Map((products ?? []).map((product) => [Number(product.xubio_product_id), product.id]));

    const upserts = rows
      .map((row) => {
        const productId = productIdByExternal.get(row.product_external_id);
        if (!productId) return null;
        return {
          product_id: productId,
          lista_precio_id: row.lista_precio_id,
          price: row.price,
          currency: "ARS",
        };
      })
      .filter((row): row is { product_id: string; lista_precio_id: number; price: number; currency: string } => Boolean(row));

    if (upserts.length === 0) {
      const result: SyncResult = {
        entityType: "price_lists",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const { error } = await supabase.from("product_prices").upsert(upserts, {
      onConflict: "product_id,lista_precio_id",
    });

    if (error) {
      throw error;
    }

    const result: SyncResult = {
      entityType: "price_lists",
      status: "success",
      recordsSynced: upserts.length,
    };
    await logSync(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      entityType: "price_lists",
      status: "error",
      recordsSynced: 0,
      errorDetail: error instanceof Error ? error.message : "Unknown error",
    };
    await logSync(result);
    return result;
  }
}
