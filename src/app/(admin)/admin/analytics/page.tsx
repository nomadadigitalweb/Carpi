"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Eye,
  Users,
  ShoppingCart,
  TrendingUp,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ArrowDown,
  ArrowUp,
  Package,
  DollarSign,
  MousePointer,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import {
  getOverviewStats,
  getDailyTraffic,
  getTopProducts,
  getBestSellers,
  getViewedNotPurchased,
  getTopPages,
  getDeviceBreakdown,
  getTopReferrers,
  getTopSearchTerms,
  getConversionFunnel,
  type OverviewStats,
  type DailyRow,
  type TopProduct,
  type TopPage,
  type DeviceBreakdown,
  type ReferrerSource,
  type SearchTerm,
  type FunnelStep,
} from "@/actions/analytics";

type Period = 7 | 15 | 30 | 90;

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Data states
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<TopProduct[]>([]);
  const [viewedNotBought, setViewedNotBought] = useState<TopProduct[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [devices, setDevices] = useState<DeviceBreakdown[]>([]);
  const [referrers, setReferrers] = useState<ReferrerSource[]>([]);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, dl, tp, bs, vnb, tpg, dev, ref, st, fn] = await Promise.all([
        getOverviewStats(),
        getDailyTraffic(period),
        getTopProducts(period),
        getBestSellers(period),
        getViewedNotPurchased(period),
        getTopPages(period),
        getDeviceBreakdown(period),
        getTopReferrers(period),
        getTopSearchTerms(period),
        getConversionFunnel(period),
      ]);
      setOverview(ov);
      setDaily(dl);
      setTopProducts(tp);
      setBestSellers(bs);
      setViewedNotBought(vnb);
      setTopPages(tpg);
      setDevices(dev);
      setReferrers(ref);
      setSearchTerms(st);
      setFunnel(fn);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone size={16} />;
    if (type === "tablet") return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  const tabs = [
    { id: "overview", label: "Resumen", icon: BarChart3 },
    { id: "products", label: "Productos", icon: Package },
    { id: "funnel", label: "Embudo", icon: TrendingUp },
    { id: "audience", label: "Audiencia", icon: Users },
    { id: "content", label: "Contenido", icon: MousePointer },
  ];

  // ─── Traffic Chart (CSS bars) ───
  const maxViews = Math.max(...daily.map((d) => d.page_views), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Análisis de Datos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Métricas avanzadas para el equipo de marketing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as Period)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <RefreshCw size={24} className="mx-auto animate-spin mb-3" />
          <p className="text-sm">Cargando métricas...</p>
        </div>
      ) : (
        <>
          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Visitas Hoy"
                  value={fmt(overview?.today_views ?? 0)}
                  subtitle={`${fmt(overview?.today_unique ?? 0)} únicos`}
                  icon={<Eye size={20} />}
                  color="bg-blue-500"
                />
                <KPICard
                  label="Visitas Semana"
                  value={fmt(overview?.week_views ?? 0)}
                  subtitle={`${fmt(overview?.week_unique ?? 0)} únicos`}
                  icon={<Users size={20} />}
                  color="bg-indigo-500"
                />
                <KPICard
                  label="Órdenes (30d)"
                  value={String(overview?.month_orders ?? 0)}
                  subtitle={fmtMoney(overview?.month_revenue ?? 0)}
                  icon={<ShoppingBag size={20} />}
                  color="bg-green-500"
                />
                <KPICard
                  label="Revenue Total"
                  value={fmtMoney(overview?.total_revenue ?? 0)}
                  subtitle={`${overview?.total_orders ?? 0} órdenes totales`}
                  icon={<DollarSign size={20} />}
                  color="bg-emerald-500"
                />
              </div>

              {/* Traffic Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Tráfico Diario
                </h3>
                {daily.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">
                    No hay datos de tráfico aún. Los datos aparecerán a medida
                    que los visitantes naveguen el sitio.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-end gap-[2px] h-40">
                      {daily.map((d, i) => (
                        <div
                          key={i}
                          className="flex-1 group relative"
                          title={`${d.date}: ${d.page_views} visitas, ${d.unique_visitors} únicos`}
                        >
                          <div
                            className="bg-blue-500/80 rounded-t-sm hover:bg-blue-600 transition-colors cursor-default mx-[0.5px]"
                            style={{
                              height: `${(d.page_views / maxViews) * 100}%`,
                              minHeight: d.page_views > 0 ? "2px" : "0",
                            }}
                          />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {d.date.slice(5)}: {d.page_views} vistas
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                      <span>{daily[0]?.date.slice(5)}</span>
                      <span>{daily[daily.length - 1]?.date.slice(5)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Conversion Funnel Quick */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Embudo de Conversión
                </h3>
                <div className="space-y-3">
                  {funnel.map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 w-40 shrink-0 text-right">
                        {step.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${Math.max(step.percentage, 2)}%` }}
                        >
                          {step.percentage > 15 && (
                            <span className="text-[11px] font-bold text-white">
                              {fmt(step.value)}
                            </span>
                          )}
                        </div>
                        {step.percentage <= 15 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-500">
                            {fmt(step.value)}
                          </span>
                        )}
                      </div>
                      {i > 0 && funnel[i - 1].value > 0 && (
                        <span className="text-xs font-mono text-gray-400 w-16 text-right">
                          {(
                            (step.value / funnel[i - 1].value) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ PRODUCTS TAB ═══════════ */}
          {activeTab === "products" && (
            <div className="space-y-6">
              {/* Best Sellers */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Productos Más Vendidos
                  </h3>
                </div>
                {bestSellers.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-400 text-center">
                    No hay ventas en este período.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left">#</th>
                        <th className="px-5 py-3 text-left">Producto</th>
                        <th className="px-5 py-3 text-right">Unidades</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                        <th className="px-5 py-3 text-right">Vistas</th>
                        <th className="px-5 py-3 text-right">Conversión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bestSellers.map((p, i) => (
                        <tr
                          key={p.product_id}
                          className="hover:bg-gray-50/50"
                        >
                          <td className="px-5 py-3 text-gray-400 font-mono">
                            {i + 1}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900 max-w-[250px] truncate">
                            {p.product_name}
                          </td>
                          <td className="px-5 py-3 text-right font-mono">
                            {p.orders}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-green-600">
                            {fmtMoney(p.revenue)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-500">
                            {fmt(p.views)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.conversion_rate >= 10
                                  ? "bg-green-50 text-green-700"
                                  : p.conversion_rate >= 3
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {p.conversion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Most Viewed Products */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Eye size={16} className="text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Productos Más Vistos
                  </h3>
                </div>
                {topProducts.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-400 text-center">
                    No hay datos de vistas aún.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left">#</th>
                        <th className="px-5 py-3 text-left">Producto</th>
                        <th className="px-5 py-3 text-right">Vistas</th>
                        <th className="px-5 py-3 text-right">
                          <ShoppingCart size={14} className="inline" /> Al
                          carrito
                        </th>
                        <th className="px-5 py-3 text-right">Vendidos</th>
                        <th className="px-5 py-3 text-right">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topProducts.slice(0, 15).map((p, i) => (
                        <tr
                          key={p.product_id}
                          className="hover:bg-gray-50/50"
                        >
                          <td className="px-5 py-3 text-gray-400 font-mono">
                            {i + 1}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900 max-w-[250px] truncate">
                            {p.product_name}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-blue-600">
                            {fmt(p.views)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-purple-600">
                            {p.cart_adds}
                          </td>
                          <td className="px-5 py-3 text-right font-mono">
                            {p.orders}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <ConversionBadge rate={p.conversion_rate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Viewed but not purchased — MARKETING INSIGHT */}
              <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-red-50 bg-red-50/50 flex items-center gap-2">
                  <ArrowDown size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wide">
                    Vistos pero NO Comprados
                  </h3>
                  <span className="ml-auto text-xs text-red-400">
                    Oportunidad de conversión
                  </span>
                </div>
                {viewedNotBought.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-400 text-center">
                    Todos los productos vistos fueron comprados, o no hay
                    suficientes datos aún.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left">Producto</th>
                        <th className="px-5 py-3 text-right">Vistas</th>
                        <th className="px-5 py-3 text-right">Al carrito</th>
                        <th className="px-5 py-3 text-right">Compras</th>
                        <th className="px-5 py-3 text-left">Insight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {viewedNotBought.map((p) => (
                        <tr
                          key={p.product_id}
                          className="hover:bg-red-50/30"
                        >
                          <td className="px-5 py-3 font-medium text-gray-900 max-w-[250px] truncate">
                            {p.product_name}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-blue-600">
                            {fmt(p.views)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-purple-600">
                            {p.cart_adds}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-red-500">
                            0
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">
                            {p.cart_adds > 0
                              ? "🛒 Interés alto, no convierten"
                              : "👀 Solo miran, sin interacción"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ FUNNEL TAB ═══════════ */}
          {activeTab === "funnel" && (
            <div className="space-y-6">
              {/* Full Funnel */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                  Embudo de Conversión Completo
                </h3>
                <div className="space-y-4">
                  {funnel.map((step, i) => {
                    const dropOff =
                      i > 0 && funnel[i - 1].value > 0
                        ? (
                            ((funnel[i - 1].value - step.value) /
                              funnel[i - 1].value) *
                            100
                          ).toFixed(1)
                        : null;

                    return (
                      <div key={i}>
                        <div className="flex items-center gap-4 mb-1">
                          <span className="text-sm font-medium text-gray-700 w-52 shrink-0">
                            {step.label}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 flex items-center px-4 ${
                                i === 0
                                  ? "bg-blue-500"
                                  : i === 1
                                  ? "bg-indigo-500"
                                  : i === 2
                                  ? "bg-purple-500"
                                  : i === 3
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.max(step.percentage, 3)}%`,
                              }}
                            >
                              <span className="text-white text-sm font-bold whitespace-nowrap">
                                {fmt(step.value)}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-mono text-gray-400 w-16 text-right">
                            {step.percentage}%
                          </span>
                        </div>
                        {dropOff && Number(dropOff) > 0 && (
                          <div className="flex justify-end mr-20 mb-1">
                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                              <ArrowDown size={10} />
                              {dropOff}% abandonó
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall conversion rate */}
                {funnel.length >= 2 &&
                  funnel[0].value > 0 &&
                  funnel[funnel.length - 1].value >= 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tasa de conversión global
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {(
                          (funnel[funnel.length - 1].value / funnel[0].value) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  )}
              </div>

              {/* Per-step analysis cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {funnel.slice(0, -1).map((step, i) => {
                  const next = funnel[i + 1];
                  const rate =
                    step.value > 0
                      ? ((next.value / step.value) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-5"
                    >
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {step.label} → {next.label}
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {rate}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {fmt(next.value)} de {fmt(step.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════ AUDIENCE TAB ═══════════ */}
          {activeTab === "audience" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Devices */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Dispositivos
                  </h3>
                  {devices.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Sin datos aún.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((d) => (
                        <div key={d.device_type} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                            {deviceIcon(d.device_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {d.device_type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {d.percentage}% · {fmt(d.count)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  d.device_type === "desktop"
                                    ? "bg-blue-500"
                                    : d.device_type === "mobile"
                                    ? "bg-green-500"
                                    : "bg-purple-500"
                                }`}
                                style={{ width: `${d.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referrers */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" />
                    Fuentes de Tráfico
                  </h3>
                  {referrers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Sin datos de referrers aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {referrers.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                        >
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">
                            {r.referrer}
                          </span>
                          <span className="text-sm font-mono text-gray-500">
                            {fmt(r.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily traffic line chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Visitantes Únicos por Día
                </h3>
                {daily.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Sin datos aún.
                  </p>
                ) : (
                  <div className="flex items-end gap-[2px] h-32">
                    {daily.map((d, i) => {
                      const maxU = Math.max(
                        ...daily.map((r) => r.unique_visitors),
                        1
                      );
                      return (
                        <div
                          key={i}
                          className="flex-1 group relative"
                          title={`${d.date}: ${d.unique_visitors} únicos`}
                        >
                          <div
                            className="bg-indigo-400/80 rounded-t-sm hover:bg-indigo-500 transition-colors cursor-default mx-[0.5px]"
                            style={{
                              height: `${(d.unique_visitors / maxU) * 100}%`,
                              minHeight:
                                d.unique_visitors > 0 ? "2px" : "0",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ CONTENT TAB ═══════════ */}
          {activeTab === "content" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <MousePointer size={16} className="text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Páginas Más Visitadas
                    </h3>
                  </div>
                  {topPages.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-gray-400 text-center">
                      Sin datos aún.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {topPages.map((p, i) => {
                        const maxP = Math.max(
                          ...topPages.map((x) => x.views),
                          1
                        );
                        return (
                          <div
                            key={i}
                            className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50"
                          >
                            <span className="text-xs text-gray-400 font-mono w-6">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate font-mono">
                                {p.path}
                              </p>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                <div
                                  className="h-1.5 rounded-full bg-blue-500"
                                  style={{
                                    width: `${(p.views / maxP) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-mono text-gray-500 shrink-0">
                              {fmt(p.views)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Search Terms */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Search size={16} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Búsquedas Populares
                    </h3>
                  </div>
                  {searchTerms.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-gray-400 text-center">
                      No se registraron búsquedas aún.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {searchTerms.map((s, i) => (
                        <div
                          key={i}
                          className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono w-6">
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-700">
                              &ldquo;{s.term}&rdquo;
                            </span>
                          </div>
                          <span className="text-sm font-mono text-gray-500">
                            {s.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───

function KPICard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div
          className={`${color} p-2.5 rounded-lg text-white shadow-lg group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ConversionBadge({ rate }: { rate: number }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        rate >= 10
          ? "bg-green-50 text-green-700"
          : rate >= 3
          ? "bg-amber-50 text-amber-700"
          : rate > 0
          ? "bg-gray-100 text-gray-500"
          : "bg-red-50 text-red-400"
      }`}
    >
      {rate}%
    </span>
  );
}
