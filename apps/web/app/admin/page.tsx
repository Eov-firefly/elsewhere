"use client";
import { useState } from "react";

type Asset = {
  id: string;
  original_title: string;
  creator: string;
  canonical_url: string;
  is_demo: boolean;
  moderation_state: string;
};
type Revision = {
  id: string;
  title: string;
  number: number;
  approved: boolean;
  delivery_mode: string;
  hook: string;
  intro: string;
  why_worth_it: string;
  evidence_level: string;
  evidence_ids: string[];
};
type Discovery = {
  id: string;
  asset_id: string;
  slug: string;
  topic: string;
  publication_state: string;
  revisions: Revision[];
};
type Audit = { id: string; action: string; reason: string; actor: string };
type Report = {
  id: string;
  discovery_id: string;
  reason: string;
  state: string;
};

function fields(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}
const tomorrow = () =>
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

export default function Admin() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const asset = assets.find((x) => x.id === selected);
  const assetDiscoveries = discoveries.filter((x) => x.asset_id === selected);

  async function request(path: string, body?: unknown) {
    const response = await fetch(`/api/admin/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined
          ? {}
          : { "Idempotency-Key": crypto.randomUUID() }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error?.message || "Request failed.");
    return result;
  }
  async function refresh(page = offset) {
    const [a, d, log, r] = await Promise.all([
      request(`assets?offset=${page}`),
      request(`discoveries?offset=${page}`),
      request("audit"),
      request("reports"),
    ]);
    setAssets(a);
    setDiscoveries(d);
    setAudits(log);
    setReports(r);
    setAuthenticated(true);
  }
  async function mutate(path: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await request(path, body);
      await refresh();
      setMessage(`Saved. ${result.id ? `Record: ${result.id}` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
    setBusy(false);
  }
  return (
    <section className="page-shell admin-shell">
      <div className="admin-intro">
        <div>
          <span className="eyebrow">BEHIND THE DAILY EDIT</span>
          <h1>Editor’s desk.</h1>
        </div>
        {authenticated && (
          <button
            onClick={() => {
              setToken("");
              setAuthenticated(false);
              setAssets([]);
              setDiscoveries([]);
              setAudits([]);
              setReports([]);
              setMessage("");
            }}
          >
            Lock desk
          </button>
        )}
      </div>
      <p className="admin-warning">
        Local development editor access. Credentials stay in memory until this
        tab closes. Public launch requires OIDC/MFA, named roles and edge rate
        limiting; do not expose this desk publicly yet.
      </p>
      {!authenticated ? (
        <form
          className="quiet-box"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await refresh();
              setMessage("Desk unlocked.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Couldn’t unlock.",
              );
            }
            setBusy(false);
          }}
        >
          <label>
            Editor access token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          <button disabled={busy}>Unlock desk</button>
          <p role="status">{message}</p>
        </form>
      ) : (
        <>
          <p role="status" className="admin-status">
            {busy
              ? "Saving…"
              : message ||
                "Only publish after actual human editorial, rights and regional delivery review."}
          </p>
          <div className="admin-grid">
            <aside>
              <section className="admin-panel">
                <h2>1. Source library</h2>
                <div className="admin-list">
                  {assets.map((a) => (
                    <button
                      key={a.id}
                      aria-pressed={selected === a.id}
                      onClick={() => setSelected(a.id)}
                    >
                      {a.original_title}
                      <small>
                        {a.creator} ·{" "}
                        {a.is_demo
                          ? "unreviewed candidate"
                          : a.moderation_state}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="admin-controls">
                  <button
                    disabled={offset === 0 || busy}
                    onClick={async () => {
                      const next = Math.max(0, offset - 50);
                      try {
                        await refresh(next);
                        setOffset(next);
                        setSelected("");
                      } catch {
                        setMessage("Couldn’t load page.");
                      }
                    }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={assets.length < 50 || busy}
                    onClick={async () => {
                      const next = offset + 50;
                      try {
                        await refresh(next);
                        setOffset(next);
                        setSelected("");
                      } catch {
                        setMessage("Couldn’t load page.");
                      }
                    }}
                  >
                    Next 50
                  </button>
                </div>
                <details>
                  <summary>Import a source</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = fields(e.currentTarget);
                      void mutate("assets/import", data);
                    }}
                  >
                    <label>
                      Canonical HTTPS URL
                      <input name="canonical_url" type="url" required />
                    </label>
                    <label>
                      Original title
                      <input name="original_title" required maxLength={300} />
                    </label>
                    <label>
                      Creator
                      <input name="creator" required maxLength={300} />
                    </label>
                    <label>
                      Type
                      <select name="content_type">
                        <option value="video">Video</option>
                        <option value="article">Article</option>
                      </select>
                    </label>
                    <button disabled={busy}>Import as pending</button>
                  </form>
                </details>
                <p className="admin-warning">
                  Imports store links only. No downloading, automatic metadata
                  verification or implied permission. YouTube and the documented
                  article allowlist are supported.
                </p>
              </section>
              <section className="admin-panel" style={{ marginTop: 25 }}>
                <h2>4. Publish a daily edition</h2>
                <p>
                  Choose up to three approved discoveries. Published editions
                  are frozen; quarantine removes unsafe content immediately.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate("slates", {
                      date: fields(e.currentTarget).date,
                      discovery_ids: chosen,
                    });
                  }}
                >
                  <label>
                    Edition date (UTC)
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </label>
                  {discoveries
                    .filter((d) => d.publication_state === "published")
                    .map((d) => (
                      <label key={d.id}>
                        <input
                          type="checkbox"
                          checked={chosen.includes(d.id)}
                          disabled={
                            !chosen.includes(d.id) && chosen.length >= 3
                          }
                          onChange={(e) =>
                            setChosen(
                              e.target.checked
                                ? [...chosen, d.id]
                                : chosen.filter((x) => x !== d.id),
                            )
                          }
                        />
                        {d.slug}
                      </label>
                    ))}
                  <button disabled={busy || chosen.length === 0}>
                    Publish {chosen.length} discoveries
                  </button>
                </form>
              </section>
            </aside>
            <div>
              <section className="admin-panel">
                <h2>2. Review the source</h2>
                {!asset ? (
                  <p>Select a source from the library to begin.</p>
                ) : (
                  <div key={asset.id}>
                    <h3>{asset.original_title}</h3>
                    <a
                      href={asset.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Inspect original source ↗
                    </a>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = fields(e.currentTarget);
                        void mutate(`assets/${asset.id}/rights-review`, {
                          permits_link: f.permits_link === "on",
                          permits_embed: f.permits_embed === "on",
                          evidence_url: f.evidence_url,
                          reason: f.reason,
                          expires_at: new Date(
                            String(f.expires_at),
                          ).toISOString(),
                        });
                      }}
                    >
                      <fieldset>
                        <legend>Actual rights decision</legend>
                        <label>
                          <input type="checkbox" name="permits_link" />
                          Canonical linking permitted
                        </label>
                        <label>
                          <input type="checkbox" name="permits_embed" />
                          Official YouTube embedding permitted
                        </label>
                        <label>
                          Evidence reference (HTTPS)
                          <input type="url" name="evidence_url" required />
                        </label>
                        <label>
                          Review notes
                          <textarea
                            name="reason"
                            required
                            placeholder="What permission/terms were checked?"
                          />
                        </label>
                        <label>
                          Valid until (local time)
                          <input
                            type="datetime-local"
                            name="expires_at"
                            defaultValue={tomorrow()}
                            required
                          />
                        </label>
                        <button disabled={busy}>
                          Record human rights review
                        </button>
                      </fieldset>
                    </form>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = fields(e.currentTarget);
                        void mutate(`assets/${asset.id}/availability-check`, {
                          ...f,
                          expires_at: new Date(
                            String(f.expires_at),
                          ).toISOString(),
                        });
                      }}
                    >
                      <fieldset>
                        <legend>Actual regional delivery check</legend>
                        <div className="form-row">
                          <label>
                            Country
                            <select name="country_code">
                              <option>US</option>
                              <option>GB</option>
                              <option>CA</option>
                              <option>AU</option>
                            </select>
                          </label>
                          <label>
                            Mode
                            <select name="delivery_mode">
                              <option value="external_link">
                                External link
                              </option>
                              <option value="official_embed">
                                Official embed
                              </option>
                            </select>
                          </label>
                          <label>
                            Result
                            <select name="result">
                              <option value="failed">Failed / blocked</option>
                              <option value="passed">Passed</option>
                            </select>
                          </label>
                        </div>
                        <label>
                          Method and observation
                          <textarea
                            name="method"
                            required
                            placeholder="Real playback/access test, region and device. HTTP 200 alone is insufficient."
                          />
                        </label>
                        <label>
                          Valid until (local time)
                          <input
                            type="datetime-local"
                            name="expires_at"
                            defaultValue={tomorrow()}
                            required
                          />
                        </label>
                        <button disabled={busy}>Record delivery check</button>
                      </fieldset>
                    </form>
                    <h2>3. Prepare a discovery</h2>
                    <details>
                      <summary>Create discovery</summary>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = fields(e.currentTarget);
                          void mutate("discoveries", {
                            ...f,
                            asset_id: asset.id,
                            estimated_minutes: f.estimated_minutes
                              ? Number(f.estimated_minutes)
                              : null,
                          });
                        }}
                      >
                        <label>
                          Slug
                          <input
                            name="slug"
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                            required
                          />
                        </label>
                        <label>
                          Topic
                          <select name="topic">
                            {[
                              "science-nature",
                              "history-culture",
                              "engineering-technology",
                              "design-craft",
                              "psychology-behavior",
                              "everyday-life",
                            ].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Actual duration (minutes, optional)
                          <input
                            type="number"
                            name="estimated_minutes"
                            min={1}
                            max={600}
                          />
                        </label>
                        <button disabled={busy}>Create draft</button>
                      </form>
                    </details>
                    {assetDiscoveries.map((d) => (
                      <section key={d.id}>
                        <h3>
                          {d.slug} · {d.publication_state}
                        </h3>
                        <details>
                          <summary>Add an immutable editorial revision</summary>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = fields(e.currentTarget);
                              void mutate(`discoveries/${d.id}/revisions`, {
                                ...f,
                                evidence_ids: String(f.evidence_ids)
                                  .split("\n")
                                  .map((x) => x.trim())
                                  .filter(Boolean),
                              });
                            }}
                          >
                            <label>
                              Editorial title
                              <input
                                name="editorial_title"
                                maxLength={300}
                                required
                              />
                            </label>
                            <label>
                              Hook
                              <input name="hook" maxLength={300} required />
                            </label>
                            <label>
                              Introduction
                              <textarea
                                name="intro"
                                required
                                maxLength={5000}
                              />
                            </label>
                            <label>
                              Why worth it
                              <textarea
                                name="why_worth_it"
                                required
                                maxLength={5000}
                              />
                            </label>
                            <label>
                              Delivery
                              <select name="delivery_mode">
                                <option value="external_link">
                                  External link
                                </option>
                                <option value="official_embed">
                                  Official embed
                                </option>
                              </select>
                            </label>
                            <label>
                              Evidence level
                              <select name="evidence_level">
                                <option value="M0">
                                  M0 — metadata only; no claims about unseen
                                  content
                                </option>
                                <option value="M1">
                                  M1 — permitted excerpt
                                </option>
                                <option value="M2">
                                  M2 — legitimately reviewed full work
                                </option>
                              </select>
                            </label>
                            <label>
                              Evidence URLs, one per line
                              <textarea name="evidence_ids" required />
                            </label>
                            <button disabled={busy}>Save revision</button>
                          </form>
                        </details>
                        {d.revisions.map((r) => (
                          <div key={r.id} className="quiet-box">
                            <strong>
                              v{r.number} · {r.title}
                            </strong>
                            <p>
                              {r.delivery_mode} ·{" "}
                              {r.approved
                                ? "Editorial approved"
                                : "Awaiting approval"}
                            </p>
                            <details>
                              <summary>
                                Read the exact copy and evidence before approval
                              </summary>
                              <p>
                                <strong>Hook:</strong> {r.hook}
                              </p>
                              <p style={{ whiteSpace: "pre-line" }}>
                                {r.intro}
                              </p>
                              <p>
                                <strong>Why worth it:</strong> {r.why_worth_it}
                              </p>
                              <p>Evidence level: {r.evidence_level}</p>
                              {r.evidence_ids.map((url) => (
                                <p key={url}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {url} ↗
                                  </a>
                                </p>
                              ))}
                            </details>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const f = fields(e.currentTarget);
                                void mutate(
                                  `discoveries/${d.id}/${r.approved ? "publish" : "approve"}`,
                                  { revision_id: r.id, reason: f.reason },
                                );
                              }}
                            >
                              <label>
                                {r.approved
                                  ? "Publication reason"
                                  : "Human editorial and evidence review notes"}
                                <input name="reason" required />
                              </label>
                              <button disabled={busy}>
                                {r.approved
                                  ? "Publish this revision"
                                  : "Approve after verification"}
                              </button>
                            </form>
                          </div>
                        ))}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void mutate(
                              `discoveries/${d.id}/quarantine`,
                              fields(e.currentTarget),
                            );
                          }}
                        >
                          <label>
                            Emergency removal reason
                            <input name="reason" required />
                          </label>
                          <button disabled={busy} className="danger">
                            Quarantine source and related discoveries
                          </button>
                        </form>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
          <section className="quiet-box">
            <h2>Reports awaiting review</h2>
            {reports.length ? (
              reports.map((r) => (
                <div className="audit-row" key={r.id}>
                  {r.discovery_id} · {r.reason} · {r.state}
                </div>
              ))
            ) : (
              <p>No reports.</p>
            )}
          </section>
          <section className="quiet-box">
            <h2>Latest audit entries</h2>
            {audits.map((a) => (
              <div key={a.id} className="audit-row">
                <strong>{a.action}</strong> · {a.actor}
                <br />
                {a.reason}
              </div>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
