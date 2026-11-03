"use client";
import { useState } from "react";
import { journalRequest } from "@/lib/journal";
export function SharedReflectionReport({ shareId }: { shareId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="shared-report">
      <button className="text-button" onClick={() => setOpen(!open)}>
        Report this shared reflection
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            try {
              await journalRequest(`shared-reflections/${shareId}/report`, {
                reason: String(new FormData(form).get("reason")),
              });
              setMessage("Report received for review.");
              setOpen(false);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Couldn’t send report.",
              );
            }
            setBusy(false);
          }}
        >
          <label>
            Reason for reporting
            <textarea name="reason" required minLength={3} maxLength={1000} />
          </label>
          <button disabled={busy}>Send report</button>
        </form>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
