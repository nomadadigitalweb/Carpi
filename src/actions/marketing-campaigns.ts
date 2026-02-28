"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { sendMarketingEmail } from "@/lib/email";
import { generateNewsletterWithAI } from "@/lib/marketing-ai";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    throw new Error("Sin permisos para campañas.");
  }

  return { supabase, user, profile };
}

export type CampaignDraftInput = {
  name: string;
  subject: string;
  contentHtml: string;
  contentText?: string;
  recipientFilter?: "usuarios_activos" | "usuarios_y_fabricantes";
};

export async function listCampaigns() {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCampaignById(campaignId: string) {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveCampaignDraft(input: CampaignDraftInput) {
  const { supabase, user } = await requireStaff();

  const payload = {
    name: input.name,
    subject: input.subject,
    content_html: input.contentHtml,
    content_text: input.contentText || null,
    recipient_filter: input.recipientFilter || "usuarios_activos",
    status: "draft",
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/campanas-marketing");
  return data;
}

export async function updateCampaignDraft(campaignId: string, input: CampaignDraftInput) {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .update({
      name: input.name,
      subject: input.subject,
      content_html: input.contentHtml,
      content_text: input.contentText || null,
      recipient_filter: input.recipientFilter || "usuarios_activos",
      status: "draft",
    })
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/campanas-marketing");
  return data;
}

export async function generateCampaignWithAI(params: {
  campaignGoal: string;
  tone?: "profesional" | "cercano" | "agresivo_comercial";
  cta?: string;
  campaignName?: string;
}) {
  await requireStaff();

  const generated = await generateNewsletterWithAI({
    campaignGoal: params.campaignGoal,
    tone: params.tone,
    cta: params.cta,
  });

  return {
    name:
      params.campaignName ||
      `Campaña ${new Date().toLocaleDateString("es-AR")}`,
    subject: generated.subject,
    contentHtml: generated.html,
    contentText: generated.text,
    aiContext: generated.analyticsContext,
  };
}

async function resolveRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: "usuarios_activos" | "usuarios_y_fabricantes"
) {
  const roles = filter === "usuarios_y_fabricantes" ? ["usuario", "fabricante"] : ["usuario"];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .in("role", roles)
    .eq("is_active", true)
    .not("email", "is", null)
    .neq("email", "");

  if (error) throw new Error(error.message);

  const unique = new Map<string, { id: string; email: string; full_name: string | null }>();
  for (const row of data ?? []) {
    const email = String(row.email).trim().toLowerCase();
    if (!email) continue;
    if (!unique.has(email)) {
      unique.set(email, {
        id: row.id,
        email,
        full_name: row.full_name,
      });
    }
  }

  return [...unique.values()];
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sendCampaign(campaignId: string) {
  const { supabase } = await requireStaff();

  const { data: campaign, error: campaignError } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || "Campaña no encontrada.");
  }

  if (!campaign.subject || !campaign.content_html) {
    throw new Error("La campaña no tiene asunto o contenido.");
  }

  const recipients = await resolveRecipients(
    supabase,
    (campaign.recipient_filter || "usuarios_activos") as "usuarios_activos" | "usuarios_y_fabricantes"
  );

  if (recipients.length === 0) {
    throw new Error("No hay destinatarios para la campaña.");
  }

  const rows = recipients.map((r) => ({
    campaign_id: campaign.id,
    profile_id: r.id,
    email: r.email,
    full_name: r.full_name,
    status: "pending",
  }));

  const { error: insertRecipientsError } = await supabase
    .from("marketing_campaign_recipients")
    .insert(rows);

  if (insertRecipientsError) {
    throw new Error(insertRecipientsError.message);
  }

  let sent = 0;
  let failed = 0;

  const chunks = chunkArray(recipients, 20);
  for (const batch of chunks) {
    const batchResults = await Promise.allSettled(
      batch.map(async (recipient) => {
        const personalizedHtml = campaign.content_html
          .replaceAll("{{nombre}}", recipient.full_name || "cliente")
          .replaceAll("{{email}}", recipient.email);

        const providerResp = await sendMarketingEmail({
          to: recipient.email,
          subject: campaign.subject,
          html: personalizedHtml,
          text: campaign.content_text || undefined,
        });

        const messageId = providerResp?.id ? String(providerResp.id) : null;

        await supabase
          .from("marketing_campaign_recipients")
          .update({
            status: "sent",
            provider_message_id: messageId,
            sent_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaign.id)
          .eq("email", recipient.email);

        return true;
      })
    );

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const recipient = batch[i];

      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        await supabase
          .from("marketing_campaign_recipients")
          .update({
            status: "failed",
            error_message:
              result.reason instanceof Error
                ? result.reason.message
                : "Error desconocido",
          })
          .eq("campaign_id", campaign.id)
          .eq("email", recipient.email);
      }
    }
  }

  const { error: updateCampaignError } = await supabase
    .from("marketing_campaigns")
    .update({
      status: sent > 0 ? "sent" : "ready",
      total_recipients: recipients.length,
      total_sent: sent,
      total_failed: failed,
      sent_at: sent > 0 ? new Date().toISOString() : null,
    })
    .eq("id", campaign.id);

  if (updateCampaignError) {
    throw new Error(updateCampaignError.message);
  }

  revalidatePath("/admin/campanas-marketing");

  return {
    recipients: recipients.length,
    sent,
    failed,
  };
}

export async function getCampaignRecipients(campaignId: string) {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("marketing_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return data ?? [];
}
