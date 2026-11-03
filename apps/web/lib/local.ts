"use client";
import type { Card } from "./api";
export function readSaved(): Card[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("elsewhere-saved") || "[]",
    );
    return Array.isArray(value)
      ? value
          .filter(
            (x) =>
              x &&
              typeof x.slug === "string" &&
              typeof x.id === "string" &&
              typeof x.title === "string",
          )
          .slice(0, 200)
      : [];
  } catch {
    return [];
  }
}
export function guestId() {
  let id = localStorage.getItem("elsewhere-guest");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("elsewhere-guest", id);
  }
  return id;
}
export async function sendEvent(event_type: string, discovery_id?: string) {
  if (localStorage.getItem("elsewhere-events") !== "yes") return;
  let session = sessionStorage.getItem("elsewhere-session");
  if (!session) {
    session = crypto.randomUUID();
    sessionStorage.setItem("elsewhere-session", session);
  }
  await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Guest-ID": guestId() },
    body: JSON.stringify({
      event_id: crypto.randomUUID(),
      session_id: session,
      event_type,
      discovery_id,
      occurred_at: new Date().toISOString(),
    }),
  });
}
