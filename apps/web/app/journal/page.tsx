"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { JournalEntry } from "@/components/journal-entry";
import { topics } from "@/components/cards";
import {
  clearReflectionDrafts,
  JournalError,
  journalRequest,
  type JournalSummary,
  type Reflection,
} from "@/lib/journal";

export default function Journal() {
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Reflection[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const account = await journalRequest<{ username: string }>("auth/me");
      const [page, counts] = await Promise.all([
        journalRequest<{ items: Reflection[]; next_cursor: string | null }>(
          "reflections",
        ),
        journalRequest<JournalSummary>("reflections/summary"),
      ]);
      setUser(account.username);
      setItems(page.items);
      setCursor(page.next_cursor);
      setSummary(counts);
    } catch (error) {
      if (error instanceof JournalError && error.status === 401) {
        setUser(null);
        setItems([]);
        setSummary(null);
      } else
        setMessage(
          error instanceof Error
            ? error.message
            : "Couldn’t open your journal.",
        );
    }
    setReady(true);
    setBusy(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function updated(entry: Reflection) {
    setItems((previous) =>
      previous.map((r) => (r.id === entry.id ? entry : r)),
    );
  }
  return (
    <section className="page-shell journal-shell">
      <div className="journal-page-heading">
        <div>
          <span className="eyebrow">LITTLE MOMENTS, OVER TIME</span>
          <h1>
            Your journal<span className="accent">.</span>
          </h1>
        </div>
        {user && (
          <Link href="/account" className="journal-link">
            {user} · Account ↗
          </Link>
        )}
      </div>
      <p>
        What you noticed. How it felt. A trail of moments you chose to keep,
        without a score to chase.
      </p>
      {!ready ? (
        <p>Opening your journal…</p>
      ) : !user ? (
        <div className="quiet-box">
          <h2>A private place to keep what stays with you.</h2>
          <p>
            Sign in to save reflections across devices. Only you can read them
            until you choose to share a link. No public feed, no streak to
            maintain.
          </p>
          <Link className="button" href="/account">
            Open your private journal ↗
          </Link>
          {message && <button onClick={() => void load()}>Try again</button>}
        </div>
      ) : (
        <>
          {summary && (
            <section
              className="journal-overview"
              aria-label="Your reflection activity"
            >
              <div className="journal-count">
                <strong>{summary.entries}</strong>
                <span>reflections kept</span>
              </div>
              <div className="journal-count">
                <strong>{summary.discoveries}</strong>
                <span>discoveries reflected on</span>
              </div>
              <p>
                These are your records, not measured watching time or a learning
                score.
              </p>
              {summary.months.length > 0 && (
                <details>
                  <summary>Your recent months (UTC)</summary>
                  <div className="month-list">
                    {summary.months.map((month) => (
                      <div key={month.month}>
                        <span>{month.month}</span>
                        <span>
                          {month.entries} reflection
                          {month.entries === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="topic-tags">
                    {summary.topics.map((t) => (
                      <span key={t.topic}>
                        {topics[t.topic] || t.topic} · {t.entries}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}
          <div className="journal-toolbar">
            <span className="eyebrow">YOUR OWN WORDS · NEWEST FIRST</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void load()}
            >
              Refresh from platform
            </button>
          </div>
          {items.length ? (
            <div className="journal-timeline">
              {items.map((entry) => (
                <JournalEntry
                  key={entry.id}
                  entry={entry}
                  onUpdated={updated}
                  onRemoved={(id) => {
                    setItems((previous) => previous.filter((r) => r.id !== id));
                    void journalRequest<JournalSummary>("reflections/summary")
                      .then(setSummary)
                      .catch(() => {});
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="quiet-box">
              <h2>Your first moment is still ahead.</h2>
              <p>
                On any discovery, leave a thought while watching or afterwards.
                A sentence is enough.
              </p>
              <Link className="button" href="/">
                Find today’s discoveries ↗
              </Link>
            </div>
          )}
          {cursor && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await journalRequest<{
                    items: Reflection[];
                    next_cursor: string | null;
                  }>(`reflections?cursor=${cursor}`);
                  setItems((previous) => [
                    ...previous,
                    ...result.items.filter(
                      (item) => !previous.some((old) => old.id === item.id),
                    ),
                  ]);
                  setCursor(result.next_cursor);
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Couldn’t load earlier reflections.",
                  );
                }
                setBusy(false);
              }}
            >
              Earlier reflections
            </button>
          )}
          <details className="journal-data">
            <summary>Your data, your choice</summary>
            <p>
              Download your words, or permanently delete your account and every
              reflection. Shared links stop working when their record is deleted
              or made private.
            </p>
            <button
              disabled={busy}
              className="secondary-button"
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await fetch("/api/reflections/export", {
                    cache: "no-store",
                  });
                  if (!response.ok)
                    throw new Error(
                      "Export failed. Please sign in and try again.",
                    );
                  const url = URL.createObjectURL(await response.blob());
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "elsewhere-journal.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Couldn’t export.",
                  );
                }
                setBusy(false);
              }}
            >
              Download my journal
            </button>
            <button
              className="text-button"
              onClick={() => setConfirmDelete(!confirmDelete)}
            >
              Delete account and journal
            </button>
            {confirmDelete && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    !confirm(
                      "Permanently delete your account, all reflections and all share links? This cannot be undone.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await journalRequest("auth/delete", {
                      password: deletePassword,
                    });
                    try {
                      clearReflectionDrafts();
                    } catch {}
                    setDeletePassword("");
                    setItems([]);
                    setSummary(null);
                    setUser(null);
                    setMessage(
                      "Account and journal deleted. Shared links have been revoked.",
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Couldn’t delete. Your account has been kept.",
                    );
                  }
                  setBusy(false);
                }}
              >
                <label>
                  Confirm your password
                  <input
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <button className="danger" disabled={busy}>
                  Permanently delete account and journal
                </button>
              </form>
            )}
          </details>
        </>
      )}
      <p role="status" className="status">
        {message}
      </p>
    </section>
  );
}
