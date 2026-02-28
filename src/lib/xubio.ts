import { XubioInvoicePayload, XubioInvoiceResponse, XubioTokenResponse } from "@/types/xubio";

let cachedToken: { value: string; expiresAt: number } | null = null;

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
  const tenantId = getRequiredEnv("XUBIO_TENANT_ID");

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      tenant_id: tenantId,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Xubio token request failed (${response.status})`);
  }

  const data = (await response.json()) as XubioTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + Math.max(data.expires_in - 30, 30) * 1000,
  };

  return data.access_token;
}

async function xubioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getRequiredEnv("XUBIO_API_URL");
  const token = await getAccessToken();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xubio API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function createXubioInvoice(payload: XubioInvoicePayload): Promise<XubioInvoiceResponse> {
  return xubioRequest<XubioInvoiceResponse>("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function syncXubioProducts(): Promise<unknown> {
  return xubioRequest<unknown>("/products", { method: "GET" });
}

export async function syncXubioPriceLists(): Promise<unknown> {
  return xubioRequest<unknown>("/price-lists", { method: "GET" });
}
