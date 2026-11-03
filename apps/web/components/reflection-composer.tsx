"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  JournalError,
  journalRequest,
  type Mood,
  type Reflection,
  type WatchingState,
} from "@/lib/journal";
import { ReflectionFields } from "./reflection-fields";

export function ReflectionComposer({
  discoveryId,
  slug,
}: {
  discoveryId: string;
  slug: string;
}) {
  const [body, setBody] = useState("");
  const [state, setState] = useState<WatchingState>("watching");
  const [mood, setMood] = useState<Mood | "">("");
  const [user, setUser] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const key = useRef("");
  const storageKey = `elsewhere-reflection-draft:${discoveryId}`;
  useEffect(() => {
    key.current = crypto.randomUUID();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved.body === "string") {
        setBody(saved.body.slice(0, 3000));
        if (["watching", "paused", "finished"].includes(saved.state))
          setState(saved.state);
        if (
          [
            "curious",
            "calm",
            "joyful",
            "moved",
            "thoughtful",
            "unsure",
            "",
          ].includes(saved.mood)
        )
          setMood(saved.mood);
        if (typeof saved.key === "string") key.current = saved.key;
        setDraftStatus("Draft kept on this device. Not uploaded yet.");
      }
    } catch {
      /* Draft storage is optional. */
    }
    setReady(true);
    void journalRequest<{ username: string }>("auth/me")
      .then((account) => setUser(account.username))
      .catch(() => {});
  }, [storageKey]);
  function updateDraft(
    nextBody: string,
    nextState: WatchingState,
    nextMood: Mood | "",
  ) {
    key.current = crypto.randomUUID();
    setMessage("");
    try {
      if (nextBody)
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            body: nextBody,
            state: nextState,
            mood: nextMood,
            key: key.current,
          }),
        );
      else localStorage.removeItem(storageKey);
      setDraftStatus(
        nextBody ? "Draft kept on this device. Not uploaded yet." : "",
      );
    } catch {
      setDraftStatus(
        "Draft is only in this tab; browser storage is unavailable.",
      );
    }
  }
  return (
    <section className="reflection-composer" id="reflection">
      <span className="eyebrow">A MOMENT WORTH KEEPING</span>
      <h2>What stays with you?</h2>
      <p>
        A thought while you watch. A feeling afterwards. Leave a little note for
        your future self.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim() || recording) return;
          setBusy(true);
          setMessage("");
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify({ body, state, mood, key: key.current }),
            );
          } catch {
            /* Keep the unsaved text in this tab when storage is unavailable. */
          }
          try {
            await journalRequest<Reflection>(
              "reflections",
              {
                discovery_id: discoveryId,
                body,
                watching_state: state,
                mood: mood || null,
              },
              key.current,
            );
            setBody("");
            setDraftStatus("");
            key.current = crypto.randomUUID();
            try {
              localStorage.removeItem(storageKey);
            } catch {
              /* Server save succeeded. */
            }
            setNeedsLogin(false);
            setMessage(
              "Saved privately to your journal. You can come back to it on any device.",
            );
          } catch (error) {
            if (error instanceof JournalError && error.status === 401) {
              setNeedsLogin(true);
              setMessage(
                "Sign in to save this privately. Your draft stays here.",
              );
            } else
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Couldn’t save. Keep this tab open and try again.",
              );
          }
          setBusy(false);
        }}
      >
        <ReflectionFields
          body={body}
          state={state}
          mood={mood}
          onRecordingChange={setRecording}
          onBody={(value) => {
            updateDraft(value, state, mood);
            setBody(value);
          }}
          onState={(value) => {
            updateDraft(body, value, mood);
            setState(value);
          }}
          onMood={(value) => {
            updateDraft(body, state, value);
            setMood(value);
          }}
        />
        <div className="action-row">
          <button disabled={busy || recording || !ready || !body.trim()}>
            {busy ? "Saving…" : "Save privately"}
          </button>
          <Link href="/journal" className="journal-link">
            Your journal ↗
          </Link>
        </div>
        <small className="journal-note">
          Private by default. Sharing is a separate choice in your journal.
          {user
            ? ` Signed in as ${user}.`
            : " Browsing never requires an account."}
        </small>
        <p className="draft-status">{draftStatus}</p>
        <p role="status">{message}</p>
        {needsLogin && (
          <Link
            className="button"
            href={`/account?next=${encodeURIComponent(`/d/${slug}#reflection`)}`}
          >
            Sign in or create a journal ↗
          </Link>
        )}
      </form>
    </section>
  );
}
