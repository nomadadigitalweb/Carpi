import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { syncXubioPriceListDetail, syncXubioPriceLists, syncXubioProducts, syncXubioStock } from "@/lib/xubio";

type SyncResult = {
  entityType: "products" | "price_lists" | "catalog";
  status: "success" | "error";
  recordsSynced: number;
  errorDetail?: string;
};

type ProductSyncOptions = {
  replaceAll?: boolean;
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

type ExistingPriceRow = {
  product_id: string;
  lista_precio_id: number;
  manual_override: boolean | null;
};

type ExistingProductRow = {
  id: string;
  xubio_product_id: number | null;
  sku: string | null;
  stock: number | null;
  name: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
  publication_status: "draft" | "published" | null;
};

type XubioStockRow = {
  product_external_id?: number;
  sku?: string;
  stock: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const messageParts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    if (messageParts.length) {
      return messageParts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error object";
    }
  }

  return "Unknown error";
}

function toDeterministicProductId(externalId: number): string {
  const hex = createHash("sha1").update(`xubio-product-${externalId}`).digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidateKeys = [
      "items",
      "data",
      "results",
      "productos",
      "products",
      "price_lists",
      "listas",
      "prices",
      "listaPrecioItem",
    ];
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

function normalizeSku(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProducts(raw: unknown): XubioProduct[] {
  const rows = toArray<Record<string, unknown>>(raw);

  return rows
    .map((row): XubioProduct | null => {
      const id = parseNumber(row.productoid ?? row.id ?? row.ID ?? row.product_id ?? row.articulo_id ?? row.external_id);
      const name = (row.name ?? row.nombre ?? row.description ?? row.descripcion) as string | undefined;

      if (!id || !name) {
        return null;
      }

      const skuRaw = row.sku ?? row.code ?? row.codigo ?? row.usrcode;
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
        price: parseNumber(row.price ?? row.precio ?? row.public_price ?? row.precio_publico),
        stock: parseNumber(
          row.stock ??
            row.available_stock ??
            row.disponible ??
            row.cantidad ??
            row.existencia ??
            row.saldo ??
            row.stock_actual ??
            row.stockActual
        ),
      };
    })
    .filter((item): item is XubioProduct => item !== null);
}

function normalizeStockRows(raw: unknown): XubioStockRow[] {
  const rows = toArray<Record<string, unknown>>(raw);

  return rows
    .map((row): XubioStockRow | null => {
      const stock = parseNumber(
        row.stock ??
          row.available_stock ??
          row.disponible ??
          row.cantidad ??
          row.existencia ??
          row.saldo ??
          row.stock_actual ??
          row.stockActual
      );

      if (stock === null) {
        return null;
      }

      const productExternalId = parseNumber(
        row.productoid ??
          row.producto_id ??
          row.product_id ??
          row.articulo_id ??
          row.id_articulo ??
          row.external_id ??
          (row.producto as Record<string, unknown> | undefined)?.id ??
          (row.producto as Record<string, unknown> | undefined)?.ID
      );

      const sku = normalizeSku(
        (row.sku ?? row.code ?? row.codigo ?? row.usrcode ??
          (row.producto as Record<string, unknown> | undefined)?.sku ??
          (row.producto as Record<string, unknown> | undefined)?.codigo) as string | undefined
      );

      if (!productExternalId && !sku) {
        return null;
      }

      return {
        product_external_id: productExternalId ?? undefined,
        sku: sku ?? undefined,
        stock,
      };
    })
    .filter((item): item is XubioStockRow => item !== null);
}

function normalizePrices(raw: unknown): XubioPriceRow[] {
  const rows = toArray<Record<string, unknown>>(raw);
  const output: XubioPriceRow[] = [];

  for (const row of rows) {
    const listaId = parseNumber(row.listaPrecioID ?? row.lista_precio_id ?? row.price_list_id ?? row.id_lista ?? row.id);

    const nestedPrices = toArray<Record<string, unknown>>(row.listaPrecioItem ?? row.prices ?? row.precios ?? row.items);

    if (nestedPrices.length && listaId) {
      for (const nestedRow of nestedPrices) {
        const productExternalId = parseNumber(
          nestedRow.product_external_id ??
            nestedRow.product_id ??
            nestedRow.articulo_id ??
            nestedRow.id_articulo ??
            (nestedRow.producto as Record<string, unknown> | undefined)?.id ??
            (nestedRow.producto as Record<string, unknown> | undefined)?.ID
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
      row.product_external_id ??
        row.product_id ??
        row.articulo_id ??
        row.id_articulo ??
        (row.producto as Record<string, unknown> | undefined)?.id ??
        (row.producto as Record<string, unknown> | undefined)?.ID
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

export async function runProductSync(options: ProductSyncOptions = {}): Promise<SyncResult> {
  try {
    const supabase = createAdminClient();

    const [response, stockResponse] = await Promise.all([syncXubioProducts(), syncXubioStock()]);
    const products = normalizeProducts(response);
    const stockRows = normalizeStockRows(stockResponse);

    const stockByExternalId = new Map<number, number>();
    const stockBySku = new Map<string, number>();
    for (const row of stockRows) {
      if (typeof row.product_external_id === "number") {
        stockByExternalId.set(row.product_external_id, Math.max(0, Math.floor(row.stock)));
      }
      if (row.sku) {
        stockBySku.set(row.sku, Math.max(0, Math.floor(row.stock)));
      }
    }

    const incomingExternalIds = new Set(products.map((product) => product.id));

    const { data: existingProducts, error: existingProductsError } = await supabase
      .from("products")
      .select("id,xubio_product_id,sku,stock,name,description,image_url,category,publication_status");

    if (existingProductsError) {
      throw existingProductsError;
    }

    const existingRows = (existingProducts ?? []) as ExistingProductRow[];
    const existingByExternalId = new Map<number, ExistingProductRow>();
    const existingBySku = new Map<string, ExistingProductRow>();

    for (const row of existingRows) {
      if (typeof row.xubio_product_id === "number" && Number.isFinite(row.xubio_product_id)) {
        existingByExternalId.set(row.xubio_product_id, row);
      }
      const normalizedSku = normalizeSku(row.sku);
      if (normalizedSku) {
        existingBySku.set(normalizedSku, row);
      }
    }

    if (options.replaceAll) {
      const missingExternalRows = existingRows
        .filter((product) => typeof product.xubio_product_id === "number")
        .filter((product) => !incomingExternalIds.has(Number(product.xubio_product_id)));

      const removableProductIds = missingExternalRows
        .map((product) => product.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (removableProductIds.length > 0) {
        const { error: archiveProductsError } = await supabase
          .from("products")
          .update({
            stock: 0,
            publication_status: "draft",
            updated_at: new Date().toISOString(),
          })
          .in("id", removableProductIds);

        if (archiveProductsError) {
          throw archiveProductsError;
        }
      }
    }

    if (products.length === 0) {
      const result: SyncResult = {
        entityType: "products",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const now = new Date().toISOString();
    const upsertRows = products.map((product) => {
      const normalizedIncomingSku = normalizeSku(product.sku);
      const existing = existingByExternalId.get(product.id) ??
        (normalizedIncomingSku ? existingBySku.get(normalizedIncomingSku) : undefined);

      return {
        id: existing?.id ?? toDeterministicProductId(product.id),
        xubio_product_id: product.id,
        sku: normalizedIncomingSku,
        name: existing?.name?.trim() ? existing.name : product.name,
        description: existing?.description ?? product.description ?? null,
        image_url: existing?.image_url ?? product.image_url ?? null,
        category: existing?.category ?? product.category ?? null,
        publication_status: existing?.publication_status ?? "draft",
        price: product.price ?? 0,
        stock: (() => {
          const fromDedicatedStock =
            stockByExternalId.get(product.id) ??
            (normalizedIncomingSku ? stockBySku.get(normalizedIncomingSku) : undefined);

          if (typeof fromDedicatedStock === "number") {
            return fromDedicatedStock;
          }

          if (typeof product.stock === "number" && Number.isFinite(product.stock)) {
            return Math.max(0, Math.floor(product.stock));
          }

          if (typeof existing?.stock === "number" && Number.isFinite(existing.stock)) {
            return Math.max(0, Math.floor(existing.stock));
          }

          return 0;
        })(),
        updated_at: now,
      };
    });

    const { error } = await supabase.from("products").upsert(upsertRows, {
      onConflict: "id",
    });

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
      errorDetail: getErrorMessage(error),
    };
    await logSync(result);
    return result;
  }
}

export async function runPriceSync(): Promise<SyncResult> {
  try {
    const supabase = createAdminClient();
    const response = await syncXubioPriceLists();
    let rows = normalizePrices(response);

    if (rows.length === 0) {
      const summaryLists = toArray<Record<string, unknown>>(response);
      const listIds = summaryLists
        .map((row) => parseNumber(row.listaPrecioID ?? row.lista_precio_id ?? row.price_list_id ?? row.id))
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      if (listIds.length > 0) {
        const detailedLists = await Promise.all(listIds.map((listId) => syncXubioPriceListDetail(listId)));
        rows = detailedLists.flatMap((listDetail) => normalizePrices(listDetail));
      }
    }

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

    const unresolvedExternalIds = Array.from(
      new Set(
        rows
          .map((row) => row.product_external_id)
          .filter((externalId) => !productIdByExternal.has(externalId))
      )
    );

    const productIdByExternalFromSku = new Map<number, string>();

    if (unresolvedExternalIds.length > 0) {
      const productCatalogResponse = await syncXubioProducts();
      const xubioProducts = normalizeProducts(productCatalogResponse);

      const skuByExternalId = new Map<number, string>();
      for (const product of xubioProducts) {
        const normalizedSku = normalizeSku(product.sku);
        if (normalizedSku) {
          skuByExternalId.set(product.id, normalizedSku);
        }
      }

      const fallbackSkus = Array.from(
        new Set(
          unresolvedExternalIds
            .map((externalId) => skuByExternalId.get(externalId) ?? null)
            .filter((sku): sku is string => typeof sku === "string")
        )
      );

      if (fallbackSkus.length > 0) {
        const { data: localBySku, error: localBySkuError } = await supabase
          .from("products")
          .select("id,sku")
          .in("sku", fallbackSkus);

        if (localBySkuError) {
          throw localBySkuError;
        }

        const localIdBySku = new Map(
          (localBySku ?? [])
            .map((row) => [normalizeSku((row as { sku?: string | null }).sku ?? null), (row as { id: string }).id] as const)
            .filter((entry): entry is readonly [string, string] => Boolean(entry[0]))
        );

        for (const externalId of unresolvedExternalIds) {
          const sku = skuByExternalId.get(externalId);
          if (!sku) continue;
          const localId = localIdBySku.get(sku);
          if (localId) {
            productIdByExternalFromSku.set(externalId, localId);
          }
        }
      }
    }

    const upserts = rows
      .map((row) => {
        const productId = productIdByExternal.get(row.product_external_id) ?? productIdByExternalFromSku.get(row.product_external_id);
        if (!productId) return null;
        return {
          product_id: productId,
          lista_precio_id: row.lista_precio_id,
          price: row.price,
          currency: "ARS",
          manual_override: false,
        };
      })
      .filter((row): row is { product_id: string; lista_precio_id: number; price: number; currency: string; manual_override: boolean } => Boolean(row));

    if (upserts.length === 0) {
      const result: SyncResult = {
        entityType: "price_lists",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const targetProductIds = Array.from(new Set(upserts.map((row) => row.product_id)));
    const targetListIds = Array.from(new Set(upserts.map((row) => row.lista_precio_id)));

    const { data: existingPriceRows, error: existingPriceRowsError } = await supabase
      .from("product_prices")
      .select("product_id,lista_precio_id,manual_override")
      .in("product_id", targetProductIds)
      .in("lista_precio_id", targetListIds);

    if (existingPriceRowsError) {
      throw existingPriceRowsError;
    }

    const manualOverrideKeys = new Set(
      ((existingPriceRows ?? []) as ExistingPriceRow[])
        .filter((row) => Boolean(row.manual_override))
        .map((row) => `${row.product_id}::${row.lista_precio_id}`)
    );

    const upsertsWithoutManualOverrides = upserts.filter(
      (row) => !manualOverrideKeys.has(`${row.product_id}::${row.lista_precio_id}`)
    );

    if (upsertsWithoutManualOverrides.length === 0) {
      const result: SyncResult = {
        entityType: "price_lists",
        status: "success",
        recordsSynced: 0,
      };
      await logSync(result);
      return result;
    }

    const { error } = await supabase.from("product_prices").upsert(upsertsWithoutManualOverrides, {
      onConflict: "product_id,lista_precio_id",
    });

    if (error) {
      throw error;
    }

    const result: SyncResult = {
      entityType: "price_lists",
      status: "success",
      recordsSynced: upsertsWithoutManualOverrides.length,
    };
    await logSync(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      entityType: "price_lists",
      status: "error",
      recordsSynced: 0,
      errorDetail: getErrorMessage(error),
    };
    await logSync(result);
    return result;
  }
}

export async function runCatalogReplaceSync(): Promise<SyncResult> {
  try {
    const productsResult = await runProductSync({ replaceAll: true });
    if (productsResult.status !== "success") {
      const result: SyncResult = {
        entityType: "catalog",
        status: "error",
        recordsSynced: productsResult.recordsSynced,
        errorDetail: productsResult.errorDetail ?? "Error al sincronizar productos",
      };
      await logSync(result);
      return result;
    }

    const pricesResult = await runPriceSync();
    if (pricesResult.status !== "success") {
      const result: SyncResult = {
        entityType: "catalog",
        status: "error",
        recordsSynced: productsResult.recordsSynced + pricesResult.recordsSynced,
        errorDetail: pricesResult.errorDetail ?? "Error al sincronizar listas de precio",
      };
      await logSync(result);
      return result;
    }

    const result: SyncResult = {
      entityType: "catalog",
      status: "success",
      recordsSynced: productsResult.recordsSynced + pricesResult.recordsSynced,
    };
    await logSync(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      entityType: "catalog",
      status: "error",
      recordsSynced: 0,
      errorDetail: getErrorMessage(error),
    };
    await logSync(result);
    return result;
  }
}
