import { createAdminClient } from "@/lib/supabase-admin";

type InvoiceMailInput = {
  to: string;
  customerName: string;
  orderId: string;
  total: number;
  cae?: string | null;
  pdfUrl?: string | null;
};

type NewsletterMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type InternalAlertMailInput = {
  subject: string;
  html: string;
  text?: string;
};

type TransferAccount = {
  bankName: string;
  cbu: string;
  alias: string;
  cuit: string;
  accountHolder?: string;
  label?: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function sanitize(value: string | undefined, fallback = "No informado"): string {
  if (!value) return fallback;
  const compact = value.trim();
  return compact.length ? compact : fallback;
}

function parseTransferAccountsFromJson(): TransferAccount[] {
  const raw = process.env.CARPI_TRANSFER_OPTIONS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const accounts: TransferAccount[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      accounts.push({
        bankName: sanitize(typeof row.bankName === "string" ? row.bankName : undefined),
        cbu: sanitize(typeof row.cbu === "string" ? row.cbu : undefined),
        alias: sanitize(typeof row.alias === "string" ? row.alias : undefined),
        cuit: sanitize(typeof row.cuit === "string" ? row.cuit : undefined),
        accountHolder: typeof row.accountHolder === "string" ? row.accountHolder.trim() : undefined,
        label: typeof row.label === "string" ? row.label.trim() : undefined,
      });
    }

    return accounts;
  } catch {
    return [];
  }
}

function parseTransferAccountsFromIndexedEnv(): TransferAccount[] {
  const accounts: TransferAccount[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const bankName = process.env[`CARPI_BANK_NAME_${index}`];
    const cbu = process.env[`CARPI_CBU_${index}`];
    const alias = process.env[`CARPI_BANK_ALIAS_${index}`];
    const cuit = process.env[`CARPI_CUIT_${index}`];
    const accountHolder = process.env[`CARPI_ACCOUNT_HOLDER_${index}`];
    const label = process.env[`CARPI_TRANSFER_LABEL_${index}`];

    if (!bankName && !cbu && !alias && !cuit && !accountHolder && !label) {
      continue;
    }

    accounts.push({
      bankName: sanitize(bankName),
      cbu: sanitize(cbu),
      alias: sanitize(alias),
      cuit: sanitize(cuit),
      accountHolder: accountHolder?.trim() || undefined,
      label: label?.trim() || undefined,
    });
  }

  return accounts;
}

function resolveTransferAccounts(): TransferAccount[] {
  const fromJson = parseTransferAccountsFromJson();
  if (fromJson.length > 0) {
    return fromJson;
  }

  const fromIndexedEnv = parseTransferAccountsFromIndexedEnv();
  if (fromIndexedEnv.length > 0) {
    return fromIndexedEnv;
  }

  return [
    {
      bankName: sanitize(process.env.CARPI_BANK_NAME, "Banco"),
      cbu: sanitize(process.env.CARPI_CBU),
      alias: sanitize(process.env.CARPI_BANK_ALIAS),
      cuit: sanitize(process.env.CARPI_CUIT),
    },
  ];
}

async function resolveTransferAccountsWithDb(): Promise<TransferAccount[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("transfer_bank_accounts")
      .select("label,bank_name,account_holder,cbu,alias,cuit,is_active,display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        label: sanitize((row as { label?: string | null }).label ?? "", "Cuenta"),
        bankName: sanitize((row as { bank_name?: string | null }).bank_name ?? "", "Banco"),
        accountHolder: sanitize((row as { account_holder?: string | null }).account_holder ?? "", "").trim() || undefined,
        cbu: sanitize((row as { cbu?: string | null }).cbu ?? ""),
        alias: sanitize((row as { alias?: string | null }).alias ?? ""),
        cuit: sanitize((row as { cuit?: string | null }).cuit ?? ""),
      }));
    }
  } catch {
    // Fallback to env-based transfer accounts.
  }

  return resolveTransferAccounts();
}

export async function sendInvoiceEmail(input: InvoiceMailInput) {
  const apiKey = required("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL || "Carpi <no-reply@carpiargentina.com>";
  const transferAccounts = await resolveTransferAccountsWithDb();

  const transferAccountsHtml = transferAccounts
    .map((account, index) => {
      const title = account.label || `Opción ${index + 1}`;
      return `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
          <p style="margin: 0 0 6px 0;"><strong>${title}</strong></p>
          <p style="margin: 0;"><strong>Banco:</strong> ${account.bankName}</p>
          ${account.accountHolder ? `<p style="margin: 0;"><strong>Titular:</strong> ${account.accountHolder}</p>` : ""}
          <p style="margin: 0;"><strong>CBU:</strong> ${account.cbu}</p>
          <p style="margin: 0;"><strong>Alias:</strong> ${account.alias}</p>
          <p style="margin: 0;"><strong>CUIT:</strong> ${account.cuit}</p>
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Factura emitida - Pedido #${input.orderId.slice(0, 8)}</h2>
      <p>Hola ${input.customerName}, tu pedido fue aprobado y facturado.</p>
      <p><strong>Total:</strong> ARS ${input.total.toLocaleString("es-AR")}</p>
      ${input.cae ? `<p><strong>CAE:</strong> ${input.cae}</p>` : ""}
      ${input.pdfUrl ? `<p><a href="${input.pdfUrl}" target="_blank" rel="noreferrer">Descargar factura PDF</a></p>` : ""}
      <hr />
      <h3>Datos bancarios para transferencia</h3>
      ${transferAccountsHtml}
      <p>Gracias por comprar en Carpi.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Factura de tu pedido #${input.orderId.slice(0, 8)} - Carpi`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error (${response.status}): ${body}`);
  }
}

export async function sendMarketingEmail(input: NewsletterMailInput) {
  const apiKey = required("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL || "Carpi <no-reply@carpiargentina.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error (${response.status}): ${body}`);
  }

  return await response.json();
}

export async function sendInternalAlertEmail(input: InternalAlertMailInput) {
  const apiKey = required("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL || "Carpi <no-reply@carpiargentina.com>";
  const to = process.env.CARPI_ALERT_EMAIL || "admin@carpi.com";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error (${response.status}): ${body}`);
  }
}
