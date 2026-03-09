import { XubioInvoicePayload, XubioInvoiceResponse, XubioTokenResponse } from "@/types/xubio";

let cachedToken: { value: string; expiresAt: number } | null = null;

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

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5000) {
    return cachedToken.value;
  }

  const baseUrl = getRequiredEnv("XUBIO_API_URL");
  const clientId = getRequiredEnv("XUBIO_CLIENT_ID");
  const clientSecret = getRequiredEnv("XUBIO_CLIENT_SECRET");
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
      secret_id: clientSecret,
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
      form.set("secret_id", clientSecret);
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

async function xubioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  if (/^https?:\/\//i.test(path)) {
    const directResponse = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!directResponse.ok) {
      const body = await directResponse.text();
      throw new Error(`Xubio API error at ${path} (${directResponse.status}): ${summarizeXubioErrorBody(body)}`);
    }

    return (await directResponse.json()) as T;
  }

  const configuredBase = process.env.XUBIO_API_URL;
  const baseCandidates = [configuredBase, "https://xubio.com/API/1.1", "https://api.xubio.com"]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ""));

  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
  let lastError = "No endpoint attempted";

  for (const baseUrl of baseCandidates) {
    const url = `${baseUrl}${pathWithSlash}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.ok) {
      return (await response.json()) as T;
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
  const stockPath = process.env.XUBIO_STOCK_PATH;
  if (!stockPath) {
    return null;
  }

  return xubioRequest<unknown>(stockPath, { method: "GET" });
}

export async function syncXubioPriceLists(): Promise<unknown> {
  const priceListsPath = process.env.XUBIO_PRICE_LISTS_PATH ?? "https://xubio.com/API/1.1/listaPrecioBean?tipo=1&activo=1";
  return xubioRequest<unknown>(priceListsPath, { method: "GET" });
}

export async function syncXubioPriceListDetail(listaPrecioId: number): Promise<unknown> {
  return xubioRequest<unknown>(`https://xubio.com/API/1.1/listaPrecioBean/${listaPrecioId}`, { method: "GET" });
}
