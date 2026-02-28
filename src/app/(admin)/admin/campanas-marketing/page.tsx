"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  Send,
  Save,
  Mail,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  listCampaigns,
  saveCampaignDraft,
  updateCampaignDraft,
  sendCampaign,
  generateCampaignWithAI,
  getCampaignRecipients,
} from "@/actions/marketing-campaigns";

const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

type Campaign = {
  id: string;
  name: string;
  subject: string;
  content_html: string;
  content_text: string | null;
  recipient_filter: string | null;
  status: "draft" | "ready" | "sent";
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  sent_at: string | null;
  created_at: string;
};

type Recipient = {
  id: string;
  email: string;
  full_name: string | null;
  status: "pending" | "sent" | "failed";
  error_message: string | null;
  sent_at: string | null;
};

export default function CampanasMarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentText, setContentText] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"usuarios_activos" | "usuarios_y_fabricantes">("usuarios_activos");

  const [goal, setGoal] = useState("Recuperar interés en productos muy vistos pero no comprados");
  const [tone, setTone] = useState<"profesional" | "cercano" | "agresivo_comercial">("profesional");
  const [cta, setCta] = useState("Ver productos");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = (await listCampaigns()) as Campaign[];
      setCampaigns(data);
      if (selected) {
        const updated = data.find((c) => c.id === selected.id) ?? null;
        setSelected(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar campañas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadRecipients = async (campaignId: string) => {
    try {
      const data = (await getCampaignRecipients(campaignId)) as Recipient[];
      setRecipients(data);
    } catch {
      setRecipients([]);
    }
  };

  const selectCampaign = async (campaign: Campaign) => {
    setSelected(campaign);
    setName(campaign.name);
    setSubject(campaign.subject);
    setContentHtml(campaign.content_html);
    setContentText(campaign.content_text || "");
    setRecipientFilter((campaign.recipient_filter as "usuarios_activos" | "usuarios_y_fabricantes") || "usuarios_activos");
    await loadRecipients(campaign.id);
  };

  const clearForm = () => {
    setSelected(null);
    setName("");
    setSubject("");
    setContentHtml("");
    setContentText("");
    setRecipientFilter("usuarios_activos");
    setRecipients([]);
  };

  const onGenerateIA = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const generated = await generateCampaignWithAI({
          campaignGoal: goal,
          tone,
          cta,
          campaignName: name || undefined,
        });

        setName(generated.name);
        setSubject(generated.subject);
        setContentHtml(generated.contentHtml);
        setContentText(generated.contentText || "");
        setMessage("Contenido generado con IA usando analytics del sitio.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al generar con IA.");
      }
    });
  };

  const onSaveDraft = () => {
    setError(null);
    setMessage(null);

    if (!name.trim() || !subject.trim() || !contentHtml.trim()) {
      setError("Completá nombre, asunto y contenido para guardar.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          subject: subject.trim(),
          contentHtml,
          contentText: contentText.trim(),
          recipientFilter,
        };

        const saved = selected
          ? await updateCampaignDraft(selected.id, payload)
          : await saveCampaignDraft(payload);

        setMessage("Borrador guardado correctamente.");
        await loadAll();

        const latest = (saved ?? null) as Campaign | null;
        if (latest) {
          await selectCampaign(latest);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el borrador.");
      }
    });
  };

  const onSendCampaign = () => {
    setError(null);
    setMessage(null);

    if (!selected) {
      setError("Primero guardá la campaña para poder enviarla.");
      return;
    }

    const ok = confirm(
      "¿Enviar esta campaña ahora? Se enviará a los destinatarios según el filtro seleccionado."
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const result = await sendCampaign(selected.id);
        setMessage(
          `Envío finalizado: ${result.sent} enviados, ${result.failed} fallidos de ${result.recipients} destinatarios.`
        );
        await loadAll();
        await loadRecipients(selected.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo enviar la campaña.");
      }
    });
  };

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => {
        acc.total++;
        if (c.status === "sent") acc.sent++;
        acc.recipients += c.total_recipients || 0;
        return acc;
      },
      { total: 0, sent: 0, recipients: 0 }
    );
  }, [campaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas de Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Newsletter con IA basada en analytics para activar ventas.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Mail size={18} />} label="Campañas" value={totals.total} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Enviadas" value={totals.sent} />
        <StatCard icon={<Users size={18} />} label="Destinatarios Totales" value={totals.recipients} />
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-500" />
              Asistente IA (con analytics)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Objetivo de campaña"
              />
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as typeof tone)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="profesional">Profesional</option>
                <option value="cercano">Cercano</option>
                <option value="agresivo_comercial">Comercial</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="CTA principal"
              />
              <button
                onClick={onGenerateIA}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
              >
                <Sparkles size={16} />
                {isPending ? "Generando..." : "Generar con IA"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Editor de Campaña</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Nombre interno de campaña"
              />
              <select
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value as typeof recipientFilter)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="usuarios_activos">Clientes usuarios activos</option>
                <option value="usuarios_y_fabricantes">Usuarios + fabricantes activos</option>
              </select>
            </div>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              placeholder="Asunto del newsletter"
            />

            <BlogEditor value={contentHtml} onChange={setContentHtml} height={420} />

            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full min-h-[110px]"
              placeholder="Versión texto plano (opcional)"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onSaveDraft}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                <Save size={16} /> Guardar Borrador
              </button>

              <button
                onClick={onSendCampaign}
                disabled={isPending || !selected}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                <Send size={16} /> Enviar Newsletter
              </button>

              <button
                onClick={clearForm}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Nueva Campaña
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Historial</h3>
            </div>
            <div className="max-h-[460px] overflow-auto divide-y divide-gray-100">
              {loading ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">Cargando...</p>
              ) : campaigns.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">No hay campañas aún.</p>
              ) : (
                campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => selectCampaign(campaign)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selected?.id === campaign.id ? "bg-gray-50" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{campaign.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{campaign.subject}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <StatusBadge status={campaign.status} />
                      <span className="text-gray-400">
                        {new Date(campaign.created_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Resultado de Envío</h3>
            </div>
            {!selected ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">Seleccioná una campaña para ver detalle.</p>
            ) : (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <MiniResult label="Destinatarios" value={selected.total_recipients || 0} />
                  <MiniResult label="Enviados" value={selected.total_sent || 0} ok />
                  <MiniResult label="Fallidos" value={selected.total_failed || 0} bad />
                </div>

                <div className="max-h-[220px] overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {recipients.length === 0 ? (
                    <p className="px-3 py-6 text-xs text-gray-400 text-center">Sin registros de envío aún.</p>
                  ) : (
                    recipients.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs flex items-start justify-between gap-3">
                        <div>
                          <p className="text-gray-700">{r.full_name || "Cliente"}</p>
                          <p className="text-gray-400">{r.email}</p>
                        </div>
                        <div className="text-right">
                          {r.status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> enviado</span>
                          ) : r.status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={12} /> error</span>
                          ) : (
                            <span className="text-amber-600">pendiente</span>
                          )}
                          {r.error_message && <p className="text-red-400 mt-1 max-w-[160px] truncate">{r.error_message}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "ready" | "sent" }) {
  if (status === "sent") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">Enviada</span>;
  }
  if (status === "ready") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">Lista</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Borrador</span>;
}

function MiniResult({ label, value, ok, bad }: { label: string; value: number; ok?: boolean; bad?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${ok ? "border-emerald-200 bg-emerald-50" : bad ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${ok ? "text-emerald-700" : bad ? "text-red-700" : "text-gray-700"}`}>{value}</p>
    </div>
  );
}
