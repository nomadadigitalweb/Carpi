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

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function sendInvoiceEmail(input: InvoiceMailInput) {
  const apiKey = required("RESEND_API_KEY");
  const from = process.env.RESEND_FROM_EMAIL || "Carpi <no-reply@carpiargentina.com>";

  const bankName = process.env.CARPI_BANK_NAME || "Banco";
  const cbu = process.env.CARPI_CBU || "No informado";
  const alias = process.env.CARPI_BANK_ALIAS || "No informado";
  const cuit = process.env.CARPI_CUIT || "No informado";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Factura emitida - Pedido #${input.orderId.slice(0, 8)}</h2>
      <p>Hola ${input.customerName}, tu pedido fue aprobado y facturado.</p>
      <p><strong>Total:</strong> ARS ${input.total.toLocaleString("es-AR")}</p>
      ${input.cae ? `<p><strong>CAE:</strong> ${input.cae}</p>` : ""}
      ${input.pdfUrl ? `<p><a href="${input.pdfUrl}" target="_blank" rel="noreferrer">Descargar factura PDF</a></p>` : ""}
      <hr />
      <h3>Datos bancarios para transferencia</h3>
      <p><strong>Banco:</strong> ${bankName}</p>
      <p><strong>CBU:</strong> ${cbu}</p>
      <p><strong>Alias:</strong> ${alias}</p>
      <p><strong>CUIT:</strong> ${cuit}</p>
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
