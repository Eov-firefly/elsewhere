import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { moods, states, type SharedReflection } from "@/lib/journal";
import { SharedReflectionReport } from "@/components/shared-reflection-report";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A shared reflection",
  robots: { index: false, follow: false },
  description: "A moment someone chose to share on Elsewhere.",
};
export default async function Shared({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  let entry: SharedReflection;
  try {
    entry = await api<SharedReflection>(
      `shared-reflections/${encodeURIComponent(shareId)}`,
    );
  } catch {
    return (
      <section className="page-shell narrow">
        <span className="eyebrow">A PRIVATE MOMENT</span>
        <h1>This reflection isn’t shared.</h1>
        <p>The author may have made it private, edited it or removed it.</p>
        <Link className="button" href="/">
          Back to today’s discoveries ↗
        </Link>
      </section>
    );
  }
  return (
    <article className="page-shell narrow shared-reflection">
      <span className="eyebrow">A MOMENT CHOSEN TO BE SHARED</span>
      <h1>What stayed with {entry.author}.</h1>
      <p className="journal-note">
        A personal reflection, shared by its author. Not an Elsewhere editorial
        endorsement.
      </p>
      <div className="quiet-box">
        <span className="eyebrow">
          {new Date(entry.created_at).toLocaleDateString("en", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}{" "}
          · UTC
        </span>
        <div className="entry-tags">
          <span>{states[entry.watching_state]}</span>
          {entry.mood && <span>{moods[entry.mood]}</span>}
        </div>
        <p className="reflection-body">{entry.body}</p>
        <small className="journal-note">
          Viewing status is self-reported, not measured playback.
        </small>
      </div>
      {entry.source ? (
        <div className="shared-source">
          <span className="eyebrow">THE DISCOVERY THAT STARTED IT</span>
          <h2>
            <Link href={`/d/${entry.source.slug}`}>
              {entry.source.title} ↗
            </Link>
          </h2>
          <p>Original work by {entry.source.creator}</p>
        </div>
      ) : (
        <p className="notice">
          The original discovery is currently unavailable. The author’s own
          reflection remains here.
        </p>
      )}
      <SharedReflectionReport shareId={shareId} />
      <Link className="button" href="/">
        A little discovery of your own ↗
      </Link>
    </article>
  );
}
