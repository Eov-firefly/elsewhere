import type { Metadata } from "next";
import Link from "next/link";
import { api, type Daily, type Detail } from "@/lib/api";
import { Artwork, topics } from "@/components/cards";
import { DiscoveryActions, SourcePlayer } from "@/components/discovery-actions";
import { ReflectionComposer } from "@/components/reflection-composer";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const item = await api<Detail>(`discoveries/${encodeURIComponent(slug)}`);
    return {
      title: item.title,
      description: item.hook,
      openGraph: { title: item.title, description: item.hook, type: "article" },
    };
  } catch {
    return { title: "Discovery unavailable", robots: { index: false } };
  }
}
export default async function Discovery({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let item: Detail;
  try {
    item = await api<Detail>(`discoveries/${encodeURIComponent(slug)}`);
  } catch {
    return (
      <section className="page-shell">
        <Link href="/">← Today’s edition</Link>
        <h1>This window is closed for now.</h1>
        <p>
          The discovery may have been removed or is temporarily unavailable.
          Your saved link never bypasses our current publication checks.
        </p>
      </section>
    );
  }
  let edition: Daily | null = null;
  try {
    edition = await api<Daily>("daily");
  } catch {
    /* Feedback requires a valid slate. */
  }
  const slateId = edition?.items.some((x) => x.id === item.id)
    ? edition.slate_id
    : null;
  return (
    <article className="detail-page">
      <Link href="/" className="back-link">
        ← Back to today’s edition
      </Link>
      <div className="detail-meta eyebrow">
        {topics[item.topic]} ·{" "}
        {item.estimated_minutes
          ? `${item.estimated_minutes} MIN`
          : "TAKE YOUR TIME"}
      </div>
      <h1>{item.title}</h1>
      <p className="detail-hook">{item.hook}</p>
      <div className="attribution">
        An original work by <strong>{item.creator}</strong> ·{" "}
        {item.source.platform}
      </div>
      <Artwork topic={item.topic} />
      <section className="editorial">
        <span className="eyebrow">A NOTE FROM THE EDITOR</span>
        <p>{item.editorial.intro}</p>
        <h2>Why we chose it</h2>
        <p>{item.editorial.why_worth_it}</p>
      </section>
      <SourcePlayer
        url={item.delivery.external_url}
        videoId={item.delivery.provider_video_id}
        mode={item.delivery.mode}
        discoveryId={item.id}
      />
      <p className="source-credit">
        Original: {item.source.original_title}. Elsewhere’s introduction is
        independent editorial commentary.
      </p>
      <DiscoveryActions item={item} slateId={slateId} />
      <ReflectionComposer discoveryId={item.id} slug={item.slug} />
      <div className="detail-ending">
        <p>There’s no need to finish it now.</p>
        <Link href="/">Return to your three discoveries ↗</Link>
      </div>
    </article>
  );
}
