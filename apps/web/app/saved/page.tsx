"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readSaved } from "@/lib/local";
import { type Card } from "@/lib/api";
export default function Saved() {
  const [items, setItems] = useState<Card[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setItems(readSaved());
    setReady(true);
  }, []);
  return (
    <section className="page-shell">
      <span className="eyebrow">FOR ANOTHER MOMENT</span>
      <h1>
        Your collection<span className="accent">.</span>
      </h1>
      <p>
        Things that caught your curiosity. Saved on this device, without an
        account.
      </p>
      {!ready ? (
        <p>Opening your collection…</p>
      ) : items.length ? (
        <div className="saved-list">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <span className="eyebrow">{item.creator}</span>
                <h2>
                  <Link href={`/d/${item.slug}`}>{item.title} ↗</Link>
                </h2>
                <p>Open to check current availability.</p>
              </div>
              <button
                onClick={() => {
                  try {
                    const next = items.filter((x) => x.id !== item.id);
                    localStorage.setItem(
                      "elsewhere-saved",
                      JSON.stringify(next),
                    );
                    setItems(next);
                  } catch {
                    setMessage("Couldn’t update local storage.");
                  }
                }}
                aria-label={`Remove ${item.title}`}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="quiet-box">
          <h2>A little space for what stays with you.</h2>
          <p>
            Save a discovery from its page and find it here when the moment is
            right.
          </p>
          <Link className="button" href="/">
            Explore today’s edition ↗
          </Link>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
