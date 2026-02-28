import {
  getOverviewStats,
  getTopProducts,
  getViewedNotPurchased,
  getTopSearchTerms,
  getConversionFunnel,
} from "@/actions/analytics";

export type GenerateNewsletterInput = {
  campaignGoal: string;
  tone?: "profesional" | "cercano" | "agresivo_comercial";
  cta?: string;
};

type AIResult = {
  subject: string;
  html: string;
  text: string;
  analyticsContext: Record<string, unknown>;
};

function fallbackTemplate(input: GenerateNewsletterInput, ctx: Record<string, unknown>): AIResult {
  const topProducts = (ctx.topProducts as Array<{ product_name: string }> | undefined) ?? [];
  const weakProducts = (ctx.viewedNotPurchased as Array<{ product_name: string }> | undefined) ?? [];

  const featured = topProducts.slice(0, 3).map((p) => `<li><strong>${p.product_name}</strong></li>`).join("");
  const opportunities = weakProducts.slice(0, 3).map((p) => `<li>${p.product_name}</li>`).join("");

  const subject = `Novedades Carpi: lo más buscado por nuestros clientes`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">Novedades para tu próxima compra</h2>
      <p>Detectamos oportunidades y productos con mayor interés para ayudarte a decidir mejor y comprar con ventaja.</p>

      <h3 style="margin: 18px 0 8px;">Productos destacados</h3>
      <ul>${featured || "<li>Estamos actualizando nuestras recomendaciones.</li>"}</ul>

      <h3 style="margin: 18px 0 8px;">Tendencias de clientes</h3>
      <ul>${opportunities || "<li>Estamos analizando nuevos comportamientos de compra.</li>"}</ul>

      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://carpiargentina.com"}/tienda"
           style="background: #111; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ${input.cta || "Ver productos"}
        </a>
      </p>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #666;">Recibiste este email por ser cliente de Carpi.</p>
    </div>
  `.trim();
  const text = [
    "Novedades Carpi",
    "",
    "Productos destacados:",
    ...topProducts.slice(0, 5).map((p) => `- ${p.product_name}`),
    "",
    "Tienda:",
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://carpiargentina.com"}/tienda`,
  ].join("\n");

  return { subject, html, text, analyticsContext: ctx };
}

export async function generateNewsletterWithAI(input: GenerateNewsletterInput): Promise<AIResult> {
  const [overview, topProducts, viewedNotPurchased, topSearchTerms, funnel] = await Promise.all([
    getOverviewStats(),
    getTopProducts(30, 8),
    getViewedNotPurchased(30, 8),
    getTopSearchTerms(30, 8),
    getConversionFunnel(30),
  ]);

  const analyticsContext = {
    overview,
    topProducts,
    viewedNotPurchased,
    topSearchTerms,
    funnel,
  };

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const instruction = `Eres un estratega de marketing B2B para e-commerce industrial en Argentina.
Devuelve SOLO JSON válido con keys exactas: subject, html, text.
Reglas: español rioplatense, claro, persuasivo sin spam, 1 CTA principal,
incluir hallazgos concretos de analytics, no inventar números, máximo 350 palabras en html.`;

  const prompt = `Objetivo campaña: ${input.campaignGoal}\nTono: ${input.tone || "profesional"}\nCTA: ${input.cta || "Ver productos"}\n\nAnalytics JSON:\n${JSON.stringify(
    analyticsContext
  )}`;

  if (geminiApiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
            contents: [{ parts: [{ text: `${instruction}\n\n${prompt}` }] }],
          }),
        }
      );

      if (response.ok) {
        const body = await response.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
        const clean = typeof text === "string" ? text.replace(/^```json\s*|```$/g, "").trim() : "";
        const parsed = JSON.parse(clean);

        if (parsed.subject && parsed.html && parsed.text) {
          return {
            subject: parsed.subject,
            html: parsed.html,
            text: parsed.text,
            analyticsContext,
          };
        }
      }
    } catch {
    }
  }

  if (openaiApiKey) {
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: instruction },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const body = await response.json();
        const content = body?.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);
        if (parsed.subject && parsed.html && parsed.text) {
          return {
            subject: parsed.subject,
            html: parsed.html,
            text: parsed.text,
            analyticsContext,
          };
        }
      }
    } catch {
    }
  }

  return fallbackTemplate(input, analyticsContext);
}
