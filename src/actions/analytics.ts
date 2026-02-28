"use server";

import { createClient } from "@/utils/supabase/server";

const STAFF_ROLES = ["admin_carpi", "gestor_financiero", "encargado_ventas"];

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !STAFF_ROLES.includes(profile.role))
    throw new Error("Sin permisos.");
  return { supabase, user, profile };
}

// ─── Types ───

export interface OverviewStats {
  today_views: number;
  today_unique: number;
  week_views: number;
  week_unique: number;
  month_views: number;
  month_unique: number;
  total_orders: number;
  total_revenue: number;
  month_orders: number;
  month_revenue: number;
}

export interface DailyRow {
  date: string;
  page_views: number;
  unique_visitors: number;
  product_views: number;
  add_to_carts: number;
  checkouts: number;
  searches: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  views: number;
  cart_adds: number;
  orders: number;
  revenue: number;
  conversion_rate: number; // views → orders %
}

export interface TopPage {
  path: string;
  views: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
  percentage: number;
}

export interface ReferrerSource {
  referrer: string;
  count: number;
}

export interface SearchTerm {
  term: string;
  count: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
}

// ─── Overview Stats ───

export async function getOverviewStats(): Promise<OverviewStats> {
  const { supabase } = await requireStaff();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
    .toISOString()
    .split("T")[0];
  const monthAgo = new Date(now.getTime() - 30 * 86400000)
    .toISOString()
    .split("T")[0];

  // Get daily aggregation data
  const { data: daily } = await supabase
    .from("analytics_daily")
    .select("*")
    .gte("date", monthAgo)
    .order("date", { ascending: false });

  const rows = (daily ?? []) as DailyRow[];
  const todayRow = rows.find((r) => r.date === todayStr);
  const weekRows = rows.filter((r) => r.date >= weekAgo);
  const monthRows = rows;

  // Get orders stats
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const { data: revenueData } = await supabase
    .from("orders")
    .select("total")
    .in("status", ["aprobado", "facturado", "pagado"]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0
  );

  const { count: monthOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthAgo);

  const { data: monthRevenueData } = await supabase
    .from("orders")
    .select("total")
    .in("status", ["aprobado", "facturado", "pagado"])
    .gte("created_at", monthAgo);

  const monthRevenue = (monthRevenueData ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0
  );

  return {
    today_views: todayRow?.page_views ?? 0,
    today_unique: todayRow?.unique_visitors ?? 0,
    week_views: weekRows.reduce((s, r) => s + r.page_views, 0),
    week_unique: weekRows.reduce((s, r) => s + r.unique_visitors, 0),
    month_views: monthRows.reduce((s, r) => s + r.page_views, 0),
    month_unique: monthRows.reduce((s, r) => s + r.unique_visitors, 0),
    total_orders: totalOrders ?? 0,
    total_revenue: totalRevenue,
    month_orders: monthOrders ?? 0,
    month_revenue: monthRevenue,
  };
}

// ─── Daily Traffic (last N days) ───

export async function getDailyTraffic(days: number = 30): Promise<DailyRow[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000)
    .toISOString()
    .split("T")[0];

  const { data } = await supabase
    .from("analytics_daily")
    .select("*")
    .gte("date", since)
    .order("date", { ascending: true });

  return (data ?? []) as DailyRow[];
}

// ─── Top Products (most viewed & conversion analysis) ───

export async function getTopProducts(
  days: number = 30,
  limit: number = 20
): Promise<TopProduct[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Product views
  const { data: viewsRaw } = await supabase
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", "product_view")
    .not("product_id", "is", null)
    .gte("created_at", since);

  // Cart adds
  const { data: cartsRaw } = await supabase
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", "add_to_cart")
    .not("product_id", "is", null)
    .gte("created_at", since);

  // Order items (actual sales)
  const { data: ordersRaw } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity, subtotal")
    .gte("created_at", since);

  // Aggregate
  const viewMap = new Map<string, number>();
  for (const e of viewsRaw ?? []) {
    if (e.product_id) viewMap.set(e.product_id, (viewMap.get(e.product_id) ?? 0) + 1);
  }

  const cartMap = new Map<string, number>();
  for (const e of cartsRaw ?? []) {
    if (e.product_id) cartMap.set(e.product_id, (cartMap.get(e.product_id) ?? 0) + 1);
  }

  const orderMap = new Map<string, { count: number; revenue: number; name: string }>();
  for (const o of ordersRaw ?? []) {
    if (o.product_id) {
      const prev = orderMap.get(o.product_id) ?? { count: 0, revenue: 0, name: "" };
      orderMap.set(o.product_id, {
        count: prev.count + (o.quantity ?? 0),
        revenue: prev.revenue + Number(o.subtotal ?? 0),
        name: o.product_name || prev.name,
      });
    }
  }

  // Merge all product IDs
  const allIds = new Set([
    ...viewMap.keys(),
    ...cartMap.keys(),
    ...orderMap.keys(),
  ]);

  // Fetch product names for any without order data
  const needNames = [...allIds].filter((id) => !orderMap.has(id));
  const nameMap = new Map<string, string>();

  if (needNames.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", needNames.slice(0, 100));
    for (const p of products ?? []) {
      nameMap.set(p.id, p.name);
    }
  }

  const results: TopProduct[] = [...allIds].map((id) => {
    const views = viewMap.get(id) ?? 0;
    const cart_adds = cartMap.get(id) ?? 0;
    const orderInfo = orderMap.get(id);
    const orders = orderInfo?.count ?? 0;
    const revenue = orderInfo?.revenue ?? 0;
    const name = orderInfo?.name || nameMap.get(id) || id;

    return {
      product_id: id,
      product_name: name,
      views,
      cart_adds,
      orders,
      revenue,
      conversion_rate: views > 0 ? Math.round((orders / views) * 100 * 10) / 10 : 0,
    };
  });

  // Sort by views desc
  results.sort((a, b) => b.views - a.views);
  return results.slice(0, limit);
}

// ─── Best Selling Products ───

export async function getBestSellers(
  days: number = 30,
  limit: number = 10
): Promise<TopProduct[]> {
  const products = await getTopProducts(days, 100);
  return products
    .filter((p) => p.orders > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ─── Products viewed but not purchased ───

export async function getViewedNotPurchased(
  days: number = 30,
  limit: number = 10
): Promise<TopProduct[]> {
  const products = await getTopProducts(days, 100);
  return products
    .filter((p) => p.views >= 3 && p.orders === 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ─── Top Pages ───

export async function getTopPages(
  days: number = 30,
  limit: number = 15
): Promise<TopPage[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("analytics_events")
    .select("path")
    .eq("event_type", "page_view")
    .gte("created_at", since);

  const countMap = new Map<string, number>();
  for (const e of data ?? []) {
    if (e.path) countMap.set(e.path, (countMap.get(e.path) ?? 0) + 1);
  }

  return [...countMap.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ─── Device Breakdown ───

export async function getDeviceBreakdown(
  days: number = 30
): Promise<DeviceBreakdown[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("analytics_events")
    .select("device_type")
    .eq("event_type", "page_view")
    .gte("created_at", since);

  const countMap = new Map<string, number>();
  let total = 0;
  for (const e of data ?? []) {
    const dt = e.device_type || "unknown";
    countMap.set(dt, (countMap.get(dt) ?? 0) + 1);
    total++;
  }

  return [...countMap.entries()]
    .map(([device_type, count]) => ({
      device_type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Top Referrers ───

export async function getTopReferrers(
  days: number = 30,
  limit: number = 10
): Promise<ReferrerSource[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("analytics_events")
    .select("referrer")
    .eq("event_type", "page_view")
    .not("referrer", "is", null)
    .neq("referrer", "")
    .gte("created_at", since);

  const countMap = new Map<string, number>();
  for (const e of data ?? []) {
    if (!e.referrer) continue;
    try {
      const host = new URL(e.referrer).hostname || e.referrer;
      countMap.set(host, (countMap.get(host) ?? 0) + 1);
    } catch {
      countMap.set(e.referrer, (countMap.get(e.referrer) ?? 0) + 1);
    }
  }

  return [...countMap.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Top Search Terms ───

export async function getTopSearchTerms(
  days: number = 30,
  limit: number = 15
): Promise<SearchTerm[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("analytics_events")
    .select("search_term")
    .eq("event_type", "search")
    .not("search_term", "is", null)
    .gte("created_at", since);

  const countMap = new Map<string, number>();
  for (const e of data ?? []) {
    if (e.search_term) {
      const term = e.search_term.toLowerCase().trim();
      countMap.set(term, (countMap.get(term) ?? 0) + 1);
    }
  }

  return [...countMap.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Conversion Funnel ───

export async function getConversionFunnel(days: number = 30): Promise<FunnelStep[]> {
  const { supabase } = await requireStaff();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const counts = await Promise.all([
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .gte("created_at", since),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "product_view")
      .gte("created_at", since),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "add_to_cart")
      .gte("created_at", since),
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "checkout")
      .gte("created_at", since),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since),
  ]);

  const values = counts.map((c) => c.count ?? 0);
  const labels = [
    "Visitas",
    "Vieron Producto",
    "Agregaron al Carrito",
    "Iniciaron Checkout",
    "Órdenes Completadas",
  ];
  const maxVal = Math.max(...values, 1);

  return labels.map((label, i) => ({
    label,
    value: values[i],
    percentage: Math.round((values[i] / maxVal) * 100),
  }));
}
