"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "carpi_analytics_sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

async function sendEvent(payload: Record<string, unknown>) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        session_id: getSessionId(),
        referrer: document.referrer || null,
      }),
      // Fire-and-forget, don't block UI
      keepalive: true,
    });
  } catch {
    // Silent fail — analytics should never break the site
  }
}

/**
 * Track a page view. Automatically fires on route changes.
 */
export function usePageTracking() {
  const pathname = usePathname();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (pathname && pathname !== lastPath.current) {
      lastPath.current = pathname;
      sendEvent({ event_type: "page_view", path: pathname });
    }
  }, [pathname]);
}

/**
 * Track a product view. Call once when a product detail page loads.
 */
export function trackProductView(productId: string, path?: string) {
  sendEvent({
    event_type: "product_view",
    product_id: productId,
    path: path || window.location.pathname,
  });
}

/**
 * Track an add-to-cart event.
 */
export function trackAddToCart(
  productId: string,
  productName?: string,
  quantity?: number
) {
  sendEvent({
    event_type: "add_to_cart",
    product_id: productId,
    path: window.location.pathname,
    metadata: { product_name: productName, quantity: quantity ?? 1 },
  });
}

/**
 * Track a search query.
 */
export function trackSearch(searchTerm: string) {
  if (!searchTerm.trim()) return;
  sendEvent({
    event_type: "search",
    search_term: searchTerm.trim(),
    path: window.location.pathname,
  });
}

/**
 * Track checkout initiation.
 */
export function trackCheckout(itemCount: number, total: number) {
  sendEvent({
    event_type: "checkout",
    path: "/checkout",
    metadata: { item_count: itemCount, total },
  });
}

/**
 * Provider component — drop into the shop layout to auto-track page views.
 */
export function AnalyticsTracker() {
  usePageTracking();
  return null;
}
