import Link from "next/link";
import type { Card } from "@/lib/api";

export const topics: Record<string, string> = {
  "science-nature": "The natural world",
  "history-culture": "People & places",
  "engineering-technology": "Ideas & invention",
  "design-craft": "Made by hand",
  "psychology-behavior": "Being human",
  "everyday-life": "Everyday wonders",
};
export function Artwork({
  topic,
  index = 0,
}: {
  topic: string;
  index?: number;
}) {
  return (
    <div className={`art art-${index % 3}`} aria-hidden="true">
      <span className="art-orbit" />
      <span className="art-shape" />
      <span className="art-line" />
      <span className="art-caption">
        A WINDOW INTO
        <br />
        {(topics[topic] || "SOMETHING NEW").toUpperCase()}
      </span>
      <span className="art-star">✳</span>
    </div>
  );
}
export function DiscoveryCard({ item, index }: { item: Card; index: number }) {
  return (
    <article className="discovery-card">
      <Link
        href={`/d/${item.slug}`}
        className="card-visual"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Artwork topic={item.topic} index={index} />
        <span className="number">0{index + 1}</span>
        <span className="open-arrow">↗</span>
      </Link>
      <div className="card-meta">
        <span>{topics[item.topic] || item.topic}</span>
        <span>
          {item.content_type === "video" ? "Watch" : "Read"} ·{" "}
          {item.estimated_minutes
            ? `${item.estimated_minutes} min`
            : "Take your time"}
        </span>
      </div>
      <h2>
        <Link href={`/d/${item.slug}`}>{item.title}</Link>
      </h2>
      <p>{item.hook}</p>
      <div className="creator">By {item.creator}</div>
    </article>
  );
}
