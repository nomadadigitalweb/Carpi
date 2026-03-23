import { XubioInvoicePayload, XubioInvoiceResponse, XubioTokenResponse } from "@/types/xubio";

let cachedToken: { value: string; expiresAt: number } | null = null;

type XubioAuthMode =
  | { kind: "api-key"; apiKey: string }
  | { kind: "bearer"; token: string };

function summarizeXubioErrorBody(rawBody: string): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return "(sin detalle)";

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const candidate =
      parsed.message ??
      parsed.error_description ??
      parsed.error ??
      parsed.detalle ??
      parsed.detail ??
      parsed.cause;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().slice(0, 240);
    }

    const withoutStack = { ...parsed };
    delete withoutStack.stackTrace;
    return JSON.stringify(withoutStack).slice(0, 240);
  } catch {
    return trimmed.replace(/\s+/g, " ").slice(0, 240);
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getXubioClientSecrets(): { clientSecret: string; secretId: string } {
  const clientSecret = process.env.XUBIO_CLIENT_SECRET?.trim();
  const secretId = process.env.XUBIO_SECRET_ID?.trim();

  const resolvedClientSecret = clientSecret ?? secretId;
  const resolvedSecretId = secretId ?? clientSecret;

  if (!resolvedClientSecret || !resolvedSecretId) {
    throw new Error("Missing XUBIO_CLIENT_SECRET/XUBIO_SECRET_ID. Configure at least one of them.");
  }

  return {
    clientSecret: resolvedClientSecret,
    secretId: resolvedSecretId,
  };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5000) {
    return cachedToken.value;
  }

  const baseUrl = getRequiredEnv("XUBIO_API_URL");
  const clientId = getRequiredEnv("XUBIO_CLIENT_ID");
  const { clientSecret, secretId } = getXubioClientSecrets();
  const tenantId = process.env.XUBIO_TENANT_ID;

  const candidates = [
    process.env.XUBIO_TOKEN_URL,
    `${baseUrl}/oauth/token`,
    "https://xubio.com/API/1.1/TokenEndpoint",
  ].filter((value): value is string => Boolean(value));

  let data: XubioTokenResponse | null = null;
  let lastError = "No token endpoint attempted";

  for (const tokenUrl of candidates) {
    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      secret_id: secretId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      grant_type: "client_credentials",
    };

    let response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const form = new URLSearchParams();
      form.set("client_id", clientId);
      form.set("client_secret", clientSecret);
      form.set("secret_id", secretId);
      if (tenantId) {
        form.set("tenant_id", tenantId);
      }
      form.set("grant_type", "client_credentials");

      response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        cache: "no-store",
      });
    }

    if (!response.ok) {
      const body = await response.text();
      lastError = `Token endpoint ${tokenUrl} failed (${response.status}): ${summarizeXubioErrorBody(body)}`;
      continue;
    }

    data = (await response.json()) as XubioTokenResponse;
    break;
  }

  if (!data?.access_token) {
    throw new Error(`Xubio token request failed. ${lastError}`);
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: now + Math.max(data.expires_in - 30, 30) * 1000,
  };

  return data.access_token;
}

async function resolveXubioAuthMode(): Promise<XubioAuthMode> {
  const apiKey = process.env.XUBIO_API_KEY?.trim();
  if (apiKey) {
    return { kind: "api-key", apiKey };
  }

  const token = await getAccessToken();
  return { kind: "bearer", token };
}

function buildAuthHeaders(auth: XubioAuthMode): Record<string, string> {
  if (auth.kind === "api-key") {
    return {
      Authorization: `Bearer ${auth.apiKey}`,
      "X-API-Key": auth.apiKey,
      "x-api-key": auth.apiKey,
      apikey: auth.apiKey,
    };
  }

  return {
    Authorization: `Bearer ${auth.token}`,
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "si", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return null;
}

function appendQueryParams(path: string, params: Record<string, string>): string {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  const [pathname, search = ""] = path.split("?", 2);
  const searchParams = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function toRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidateKeys = [
      "items",
      "data",
      "results",
      "rows",
      "registros",
      "productos",
      "stock",
      "productoStock",
    ];

    for (const key of candidateKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
      }
    }
  }

  return [];
}

function readPaginationTotalPages(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const candidates = [
    obj.totalPaginas,
    obj.total_paginas,
    obj.totalPages,
    obj.total_pages,
    (obj.paginacion as Record<string, unknown> | undefined)?.totalPaginas,
    (obj.paginacion as Record<string, unknown> | undefined)?.total_pages,
    (obj.pagination as Record<string, unknown> | undefined)?.totalPages,
    (obj.pagination as Record<string, unknown> | undefined)?.total_pages,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function readHasNextPage(raw: unknown): boolean | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const candidates = [
    obj.hasNext,
    obj.has_next,
    obj.tieneSiguiente,
    (obj.paginacion as Record<string, unknown> | undefined)?.hasNext,
    (obj.paginacion as Record<string, unknown> | undefined)?.has_next,
    (obj.pagination as Record<string, unknown> | undefined)?.hasNext,
    (obj.pagination as Record<string, unknown> | undefined)?.has_next,
  ];

  for (const value of candidates) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "si", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
    }
  }

  return null;
}

async function xubioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await resolveXubioAuthMode();
  const authHeaders = buildAuthHeaders(auth);

  console.log("[xubioRequest] Auth mode resolved, headers keys:", Object.keys(authHeaders));

  if (/^https?:\/\//i.test(path)) {
    console.log("[xubioRequest] Direct URL:", path);
    const directResponse = await fetch(path, {
      ...init,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    console.log("[xubioRequest] Response status:", directResponse.status);

    if (!directResponse.ok) {
      const body = await directResponse.text();
      throw new Error(`Xubio API error at ${path} (${directResponse.status}): ${summarizeXubioErrorBody(body)}`);
    }

    try {
      return (await directResponse.json()) as T;
    } catch (parseError) {
      const body = await directResponse.text();
      throw new Error(`Invalid JSON response from ${path}: "${body.slice(0, 200)}..."`);
    }
  }

  const configuredBase = process.env.XUBIO_API_URL;
  const baseCandidates = [configuredBase, "https://xubio.com/API/1.1", "https://api.xubio.com"]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ""));

  console.log("[xubioRequest] Base candidates:", baseCandidates);

  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
  let lastError = "No endpoint attempted";

  for (const baseUrl of baseCandidates) {
    const url = `${baseUrl}${pathWithSlash}`;
    console.log("[xubioRequest] Attempting:", url);

    const response = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    console.log("[xubioRequest] Response from", url, "status:", response.status);

    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch (parseError) {
        const body = await response.text();
        lastError = `Invalid JSON at ${url}: "${body.slice(0, 200)}..."`;
        console.error("[xubioRequest]", lastError);
        continue;
      }
    }

    const body = await response.text();
    lastError = `Xubio API error at ${url} (${response.status}): ${summarizeXubioErrorBody(body)}`;
  }

  throw new Error(lastError);
}

function normalizeXubioInvoiceResponse(payload: Record<string, unknown>): XubioInvoiceResponse {
  const rawId = payload.id ?? payload.ID ?? payload.transaccionid ?? payload.transaccionId ?? payload.comprobante;
  if (!rawId) {
    throw new Error("Xubio invoice response missing id/transaccionid");
  }

  const rawCae = payload.cae ?? payload.CAE;
  const rawPdf = payload.pdf_url ?? payload.pdfUrl ?? payload.urlPdf ?? payload.urlPDF;

  return {
    id: String(rawId),
    cae: rawCae ? String(rawCae) : "",
    pdf_url: rawPdf ? String(rawPdf) : "",
  };
}

export async function createXubioInvoice(payload: XubioInvoicePayload): Promise<XubioInvoiceResponse> {
  const configuredPath = process.env.XUBIO_INVOICE_PATH;
  const candidates = [
    configuredPath,
    "https://xubio.com/API/1.1/facturar",
    "https://xubio.com/API/1.1/comprobanteVentaBean",
  ].filter((value): value is string => Boolean(value));

  let lastError = "No invoice endpoint attempted";

  for (const endpoint of candidates) {
    try {
      const response = await xubioRequest<Record<string, unknown>>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return normalizeXubioInvoiceResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown invoice error";
      if (!/\(404\)/.test(message)) {
        throw error;
      }
      lastError = message;
    }
  }

  throw new Error(lastError);
}

export async function syncXubioProducts(): Promise<unknown> {
  const productsPath = process.env.XUBIO_PRODUCTS_PATH ?? "https://xubio.com/API/1.1/ProductoVentaBean?activo=1";
  return xubioRequest<unknown>(productsPath, { method: "GET" });
}

export async function syncXubioStock(): Promise<unknown | null> {
  const configuredBase = process.env.XUBIO_API_URL?.replace(/\/+$/, "");
  const candidates = [
    process.env.XUBIO_STOCK_PATH,
    "https://xubio.com/API/1.1/productoStock",
    configuredBase ? `${configuredBase}/productoStock` : undefined,
  ].filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    return null;
  }

  const pageStart = parsePositiveInt(process.env.XUBIO_STOCK_PAGE_START, 1);
  const pageLimit = parsePositiveInt(process.env.XUBIO_STOCK_PAGE_SIZE, 100);
  const maxPages = parsePositiveInt(process.env.XUBIO_STOCK_MAX_PAGES, 200);

  const commonParams: Record<string, string> = {};
  const fecha = process.env.XUBIO_STOCK_FECHA?.trim();
  const depositoId = process.env.XUBIO_STOCK_DEPOSITO_ID?.trim();
  const incluirInactivos = parseOptionalBoolean(process.env.XUBIO_STOCK_INCLUIR_INACTIVOS);

  if (fecha) {
    commonParams.fecha = fecha;
  }
  if (depositoId) {
    commonParams.depositoid = depositoId;
  }
  if (incluirInactivos !== null) {
    commonParams.incluirInactivos = incluirInactivos ? "true" : "false";
  }

  console.log("[syncXubioStock] Candidates:", candidates);
  console.log("[syncXubioStock] Common params:", commonParams);

  let lastError = "No stock endpoint attempted";
  for (const endpoint of candidates) {
    try {
      const allRows: Record<string, unknown>[] = [];

      for (let page = pageStart; page < pageStart + maxPages; page += 1) {
        const pagedEndpoint = appendQueryParams(endpoint, {
          ...commonParams,
          pagina: String(page),
          limitePagina: String(pageLimit),
        });

        console.log(`[syncXubioStock] Fetching page ${page}: ${pagedEndpoint}`);

        const pageResponse = await xubioRequest<unknown>(pagedEndpoint, { method: "GET" });
        console.log("[syncXubioStock] Raw response keys:", pageResponse && typeof pageResponse === "object" ? Object.keys(pageResponse as Record<string, unknown>) : typeof pageResponse);
        console.log("[syncXubioStock] Response sample:", JSON.stringify(pageResponse).slice(0, 500));
        
        const rows = toRows(pageResponse);

        console.log(`[syncXubioStock] Page ${page} returned ${rows.length} rows`);

        if (rows.length === 0) {
          break;
        }

        allRows.push(...rows);

        const totalPages = readPaginationTotalPages(pageResponse);
        if (typeof totalPages === "number" && page >= totalPages) {
          console.log(`[syncXubioStock] Reached total pages: ${totalPages}`);
          break;
        }

        const hasNext = readHasNextPage(pageResponse);
        if (hasNext === false) {
          console.log(`[syncXubioStock] hasNext is false, stopping`);
          break;
        }

        if (hasNext === null && rows.length < pageLimit) {
          console.log(`[syncXubioStock] Less rows than limit, stopping`);
          break;
        }
      }

      console.log(`[syncXubioStock] Success: ${allRows.length} total rows`);
      return allRows;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown stock sync error";
      console.error(`[syncXubioStock] Error with endpoint: ${message}`);
      if (!/\(404\)/.test(message)) {
        throw error;
      }
      lastError = message;
    }
  }

  throw new Error(lastError);
}

export async function syncXubioPriceLists(): Promise<unknown> {
  const priceListsPath = process.env.XUBIO_PRICE_LISTS_PATH ?? "https://xubio.com/API/1.1/listaPrecioBean?tipo=1&activo=1";
  return xubioRequest<unknown>(priceListsPath, { method: "GET" });
}

export async function syncXubioPriceListDetail(listaPrecioId: number): Promise<unknown> {
  return xubioRequest<unknown>(`https://xubio.com/API/1.1/listaPrecioBean/${listaPrecioId}`, { method: "GET" });
}
