"use client";
import { useEffect, useState } from "react";
import type { Card } from "@/lib/api";
import { guestId, readSaved, sendEvent } from "@/lib/local";

export function DiscoveryActions({
  item,
  slateId,
}: {
  item: Card;
  slateId: string | null;
}) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  useEffect(() => {
    setSaved(readSaved().some((x) => x.id === item.id));
    void sendEvent("discovery_open", item.id).catch(() => {});
  }, [item.id]);
  function toggleSave() {
    try {
      const next = saved
        ? readSaved().filter((x) => x.id !== item.id)
        : [...readSaved().filter((x) => x.id !== item.id), item].slice(-200);
      localStorage.setItem("elsewhere-saved", JSON.stringify(next));
      setSaved(!saved);
      setMessage(
        saved ? "Removed from your collection." : "Saved on this device.",
      );
      void sendEvent("discovery_save", item.id).catch(() => {});
    } catch {
      setMessage("Your browser couldn’t save this. Check storage permissions.");
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: item.title, url: location.href });
      else await navigator.clipboard.writeText(location.href);
      setMessage("Link shared or copied.");
      void sendEvent("share_action", item.id).catch(() => {});
    } catch {
      setMessage(
        "Sharing cancelled or unavailable. You can copy the page address.",
      );
    }
  }
  async function feedback(value: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Guest-ID": guestId(),
        },
        body: JSON.stringify({
          discovery_id: item.id,
          slate_id: slateId,
          value,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Couldn’t send feedback.");
      setMessage("Thank you. Your feedback helps shape future editions.");
      void sendEvent("feedback_submit", item.id).catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
    setBusy(false);
  }
  return (
    <section className="action-panel">
      <div className="action-row">
        <button onClick={toggleSave} aria-pressed={saved}>
          {saved ? "✓ In your collection" : "+ Save for another moment"}
        </button>
        <button onClick={share}>Share ↗</button>
      </div>
      {slateId && (
        <div className="feedback">
          <p>Was this worth your time?</p>
          <button disabled={busy} onClick={() => feedback("worth_it")}>
            Yes, worth it
          </button>
          <button disabled={busy} onClick={() => feedback("not_for_me")}>
            Not for me
          </button>
          <small>
            Your answer helps our editors. It doesn’t personalize today’s
            edition.
          </small>
        </div>
      )}
      <button className="text-button" onClick={() => setReporting(!reporting)}>
        Report a problem
      </button>
      {reporting && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const form = e.currentTarget;
            const reason = String(new FormData(form).get("reason"));
            try {
              const response = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ discovery_id: item.id, reason }),
              });
              if (!response.ok)
                throw new Error(
                  "Couldn’t submit your report. Please try again.",
                );
              setMessage("Report received. Our editor will review it.");
              setReporting(false);
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Please try again.",
              );
            }
            setBusy(false);
          }}
        >
          <label>
            What went wrong?
            <textarea
              name="reason"
              minLength={3}
              maxLength={1000}
              required
              placeholder="Broken source, attribution, content or rights issue…"
            />
          </label>
          <button disabled={busy}>Send report</button>
        </form>
      )}
      <p role="status" className="status">
        {message}
      </p>
    </section>
  );
}

export function SourcePlayer({
  url,
  videoId,
  mode,
  discoveryId,
}: {
  url: string;
  videoId: string | null;
  mode: string;
  discoveryId: string;
}) {
  const [load, setLoad] = useState(false);
  const canEmbed =
    mode === "official_embed" && videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId);
  return (
    <div className="source-player">
      {canEmbed &&
        (load ? (
          <iframe
            title="Original video on YouTube"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0`}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="player-consent">
            <span aria-hidden>▷</span>
            <p>Watch the creator’s original video.</p>
            <small>
              Loading the player connects to YouTube. Its privacy policy and
              recommendations apply.
            </small>
            <button onClick={() => setLoad(true)}>Load YouTube player</button>
          </div>
        ))}
      <a
        className="button"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void sendEvent("source_open", discoveryId).catch(() => {});
        }}
      >
        Open the original source ↗
      </a>
      <small>Opens a new tab. Come back whenever you’re ready.</small>
    </div>
  );
}
