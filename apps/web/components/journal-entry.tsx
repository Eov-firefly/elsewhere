"use client";
import Link from "next/link";
import { useState } from "react";
import {
  journalRequest,
  moods,
  states,
  type Mood,
  type Reflection,
  type WatchingState,
} from "@/lib/journal";
import { ReflectionFields } from "./reflection-fields";

export function JournalEntry({
  entry,
  onUpdated,
  onRemoved,
}: {
  entry: Reflection;
  onUpdated: (entry: Reflection) => void;
  onRemoved: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(entry.body);
  const [state, setState] = useState<WatchingState>(entry.watching_state);
  const [mood, setMood] = useState<Mood | "">(entry.mood || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [recording, setRecording] = useState(false);
  async function action(name: string, extra: object = {}) {
    setBusy(true);
    setMessage("");
    try {
      const result = await journalRequest<Reflection>(
        `reflections/${entry.id}/${name}`,
        { version: entry.version, ...extra },
        crypto.randomUUID(),
      );
      if (name === "delete") {
        onRemoved(entry.id);
        return;
      }
      onUpdated(result);
      setEditing(false);
      setMessage(
        name === "share"
          ? "Published. Anyone with the link can read this reflection and your username."
          : name === "unshare"
            ? "Private again. The old share link no longer works."
            : "Changes saved privately. Any previous share link has been revoked.",
      );
      setShareUrl(
        result.share_id ? `${location.origin}/r/${result.share_id}` : "",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn’t save. Your edited text is still here.",
      );
    }
    setBusy(false);
  }
  return (
    <article className="journal-entry">
      <div className="journal-entry-heading">
        <time dateTime={entry.created_at}>
          {new Date(entry.created_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </time>
        <span
          className={`visibility-label ${entry.share_id ? "is-public" : ""}`}
        >
          {entry.share_id ? "Shared by link" : "Only you"}
        </span>
      </div>
      <h2>
        {entry.source ? (
          <Link href={`/d/${entry.source.slug}`}>{entry.source.title} ↗</Link>
        ) : (
          "A discovery that’s currently unavailable"
        )}
      </h2>
      {entry.source && (
        <p className="entry-source">
          {entry.source.creator} ·{" "}
          {entry.source.estimated_minutes
            ? `${entry.source.estimated_minutes} min source`
            : "Duration not recorded"}
        </p>
      )}
      <div className="entry-tags">
        <span>{states[entry.watching_state]}</span>
        {entry.mood && <span>{moods[entry.mood]}</span>}
      </div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!recording)
              void action("edit", {
                body,
                watching_state: state,
                mood: mood || null,
              });
          }}
        >
          <ReflectionFields
            id={entry.id}
            body={body}
            state={state}
            mood={mood}
            onBody={setBody}
            onState={setState}
            onMood={setMood}
            onRecordingChange={setRecording}
          />
          <p className="journal-note">
            Saving edits makes this private again and revokes its old share
            link.
          </p>
          <div className="action-row">
            <button disabled={busy || recording || !body.trim()}>
              Save changes privately
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || recording}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="reflection-body">{entry.body}</p>
      )}
      {entry.updated_at !== entry.created_at && (
        <small className="journal-note">
          Edited {new Date(entry.updated_at).toLocaleString()}
        </small>
      )}
      {entry.moderation_state !== "clear" && (
        <p className="notice">
          This reflection is private and cannot be shared while under
          moderation. Your own copy remains available.
        </p>
      )}
      {!editing && (
        <div className="entry-controls">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              setBody(entry.body);
              setState(entry.watching_state);
              setMood(entry.mood || "");
              setEditing(true);
              setMessage("");
            }}
          >
            Edit
          </button>
          {entry.share_id ? (
            <>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void action("unshare")}
              >
                Make private
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={async () => {
                  const url = `${location.origin}/r/${entry.share_id}`;
                  setShareUrl(url);
                  try {
                    await navigator.clipboard.writeText(url);
                    setMessage("Share link copied.");
                  } catch {
                    setMessage("Copy the share link below.");
                  }
                }}
              >
                Copy share link
              </button>
            </>
          ) : (
            <button
              className="secondary-button"
              disabled={busy || entry.moderation_state !== "clear"}
              onClick={() => {
                if (
                  confirm(
                    "Publish this reflection? Anyone with its link can read your words and username. You can make it private again at any time.",
                  )
                )
                  void action("share");
              }}
            >
              Share publicly
            </button>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "Permanently delete this reflection and revoke any share link?",
                )
              )
                void action("delete");
            }}
          >
            Delete
          </button>
        </div>
      )}
      {entry.share_id && shareUrl && (
        <div>
          <label htmlFor={`share-${entry.id}`}>Share link</label>
          <input
            id={`share-${entry.id}`}
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
          />
          <Link
            href={`/r/${entry.share_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open public view ↗
          </Link>
        </div>
      )}
      <p role="status" className="status">
        {busy ? "Syncing…" : message}
      </p>
    </article>
  );
}
