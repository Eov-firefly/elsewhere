import type { Card } from "./api";
export type WatchingState = "watching" | "paused" | "finished";
export type Mood =
  | "curious"
  | "calm"
  | "joyful"
  | "moved"
  | "thoughtful"
  | "unsure";
export type Reflection = {
  id: string;
  version: number;
  body: string;
  watching_state: WatchingState;
  mood: Mood | null;
  created_at: string;
  updated_at: string;
  source: Card | null;
  share_id: string | null;
  visibility: "private" | "public";
  moderation_state: string;
};
export type SharedReflection = Pick<
  Reflection,
  "body" | "watching_state" | "mood" | "created_at" | "updated_at" | "source"
> & { author: string };
export type JournalSummary = {
  entries: number;
  discoveries: number;
  month_basis: string;
  months: { month: string; entries: number }[];
  topics: { topic: string; entries: number }[];
};
export const states: Record<WatchingState, string> = {
  watching: "Watching / reading",
  paused: "Pausing here",
  finished: "Finished",
};
export const moods: Record<Mood, string> = {
  curious: "Curious",
  calm: "Calm",
  joyful: "Joyful",
  moved: "Moved",
  thoughtful: "Thoughtful",
  unsure: "Still figuring it out",
};
export class JournalError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function journalRequest<T>(
  path: string,
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new JournalError(
      result.error?.message ||
        "Couldn’t sync right now. Your draft hasn’t been discarded.",
      response.status,
    );
  return result;
}
export function clearReflectionDrafts() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith("elsewhere-reflection-draft:"))
      localStorage.removeItem(key);
}
