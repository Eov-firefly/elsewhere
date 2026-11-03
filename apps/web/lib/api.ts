export type Card = {
  id: string;
  slug: string;
  title: string;
  hook: string;
  topic: string;
  content_type: string;
  estimated_minutes: number | null;
  creator: string;
  delivery_mode: string;
  position?: number;
};
export type Daily = {
  date: string;
  slate_id: string | null;
  items: Card[];
  shortfall_reason: string | null;
};
export type Detail = Card & {
  editorial: {
    title: string;
    hook: string;
    intro: string;
    why_worth_it: string;
  };
  source: {
    original_title: string;
    creator: string;
    platform: string;
    canonical_url: string;
  };
  delivery: {
    mode: string;
    provider: string;
    provider_video_id: string | null;
    external_url: string;
  };
};
export async function api<T>(path: string): Promise<T> {
  const response = await fetch(
    `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/api/v1/${path}`,
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
