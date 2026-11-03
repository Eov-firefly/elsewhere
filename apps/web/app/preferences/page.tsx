"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { clearReflectionDrafts } from "@/lib/journal";
export default function Preferences() {
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      setConsent(localStorage.getItem("elsewhere-events") === "yes");
    } catch {
      /* Storage is optional. */
    }
  }, []);
  return (
    <section className="page-shell narrow">
      <span className="eyebrow">YOUR ATTENTION. YOUR CHOICE.</span>
      <h1>A little privacy.</h1>
      <p>
        Everyone gets the same three discoveries. There is no behavioral ranking
        or fingerprinting. Browsing is account-free; a private journal account
        is optional.
      </p>
      <div className="quiet-box">
        <h2>Help us understand what’s worthwhile</h2>
        <p>
          Optional analytics sends only a random device identifier, session
          identifier, action, discovery ID and timestamp. It is off by default.
          Explicit feedback is stored when you submit it, regardless of this
          setting.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              try {
                localStorage.setItem(
                  "elsewhere-events",
                  e.target.checked ? "yes" : "no",
                );
                setConsent(e.target.checked);
                setMessage("Preference saved on this device.");
              } catch {
                setMessage("Your browser blocked local storage.");
              }
            }}
          />{" "}
          Allow optional usage analytics
        </label>
      </div>
      <div className="quiet-box">
        <h2>Start fresh</h2>
        <p>
          Delete feedback and analytics linked to this device identifier, then
          clear local saves, the identifier and your analytics preference.
          Anonymous issue reports remain for content review. Server and hosting
          access logs are separate; never enter personal information in reports.
          This also clears unsaved reflection drafts on this device. Your
          account journal is separate.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                "Delete this device’s saved discoveries, feedback and analytics? This cannot be undone.",
              )
            )
              return;
            setBusy(true);
            try {
              const id = localStorage.getItem("elsewhere-guest");
              if (id) {
                const response = await fetch("/api/privacy/delete", {
                  method: "POST",
                  headers: { "X-Guest-ID": id },
                });
                if (!response.ok)
                  throw new Error(
                    "Deletion failed. Your identifier has been kept so you can retry.",
                  );
              }
              for (const key of [
                "elsewhere-guest",
                "elsewhere-events",
                "elsewhere-saved",
              ])
                localStorage.removeItem(key);
              sessionStorage.removeItem("elsewhere-session");
              clearReflectionDrafts();
              setConsent(false);
              setMessage(
                "Your linked data and local collection have been cleared.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Couldn’t clear your data.",
              );
            }
            setBusy(false);
          }}
        >
          Delete my data
        </button>
      </div>
      <div className="quiet-box">
        <h2>Your journal and voice input</h2>
        <p>
          Reflections are private until you explicitly share a link. Your
          journal stores text, viewing status and optional feeling labels under
          your account. It is not used to infer a learning score.
        </p>
        <p>
          Voice input starts only when you choose it. Your browser’s speech
          provider may process your audio; Elsewhere receives only text you
          confirm and save, and stores no recordings.
        </p>
        <Link href="/journal">
          Export reflections or delete your account and journal ↗
        </Link>
      </div>
      <p>
        Source links open external websites. YouTube players load only when you
        choose, and are subject to YouTube’s privacy policy. Elsewhere cannot
        control recommendations on those sites.
      </p>
      <p role="status">{message}</p>
    </section>
  );
}
