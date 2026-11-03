"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearReflectionDrafts, journalRequest } from "@/lib/journal";
export default function Account() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void journalRequest<{ username: string }>("auth/me")
      .then((account) => setUser(account.username))
      .catch(() => {});
  }, []);
  return (
    <section className="page-shell narrow">
      <span className="eyebrow">SOMETHING TO COME BACK TO</span>
      <h1>A place for your thoughts.</h1>
      <p>
        Your discoveries are open to everyone. An optional account keeps your
        personal reflections in sync across devices.
      </p>
      {user ? (
        <div className="quiet-box">
          <h2>Welcome back, {user}.</h2>
          <Link className="button" href="/journal">
            Open your journal ↗
          </Link>
          <p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await journalRequest("auth/logout", {});
                  try {
                    clearReflectionDrafts();
                  } catch {}
                  setUser(null);
                  setPassword("");
                  setMessage("Signed out. Local reflection drafts cleared.");
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Couldn’t sign out.",
                  );
                }
                setBusy(false);
              }}
            >
              Sign out
            </button>
          </p>
          <small>
            Signing out clears unsaved local reflection drafts on this device.
            Your saved journal stays on the platform.
          </small>
        </div>
      ) : (
        <div className="quiet-box">
          <div className="account-tabs">
            <button
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Sign in
            </button>
            <button
              aria-pressed={mode === "register"}
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              try {
                await journalRequest(`auth/${mode}`, { username, password });
                setPassword("");
                const requested =
                  new URLSearchParams(location.search).get("next") ||
                  "/journal";
                const destination = /^\/d\/[a-z0-9-]+(?:#reflection)?$/.test(
                  requested,
                )
                  ? requested
                  : "/journal";
                location.assign(destination);
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Couldn’t sign in.",
                );
              }
              setBusy(false);
            }}
          >
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                minLength={3}
                maxLength={40}
                pattern="[a-z0-9][a-z0-9_-]{2,39}"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <small>
              3–40 lowercase letters, numbers, underscores or hyphens. This name
              is shown only when you choose to share a reflection.
            </small>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
            </label>
            <button disabled={busy}>
              {busy
                ? "One moment…"
                : mode === "register"
                  ? "Create my private journal"
                  : "Sign in to my journal"}
            </button>
          </form>
          <p className="journal-note">
            Use at least 12 characters. No email is collected; email password
            recovery is not available in this version. Save your credentials
            somewhere you can find them.
          </p>
        </div>
      )}
      <p role="status">{message}</p>
      <Link href="/">Keep exploring without an account ↗</Link>
    </section>
  );
}
