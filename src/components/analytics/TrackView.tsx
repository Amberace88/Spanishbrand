"use client";
import { useEffect } from "react";

/** Fires a first-party view event once (the API drops it without analytics consent). */
export function TrackView({ event, productId, collectionId, contentId }: { event: "product_view" | "collection_view" | "content_view"; productId?: string; collectionId?: string; contentId?: string }) {
  useEffect(() => {
    if (!document.cookie.includes("consent=all")) return;
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, productId, collectionId, contentId, path: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [event, productId, collectionId, contentId]);
  return null;
}
