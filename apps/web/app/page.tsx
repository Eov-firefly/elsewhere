import { api, type Daily } from "@/lib/api";
import { DiscoveryCard } from "@/components/cards";
import { DailyVisit } from "@/components/daily-visit";
export const dynamic = "force-dynamic";

export default async function Home() {
  let edition: Daily | null = null;
  try {
    edition = await api<Daily>("daily");
  } catch {
    /* Render a truthful service state. */
  }
  const day = edition?.date || new Date().toISOString().slice(0, 10);
  const dateLabel = new Date(`${day}T12:00:00Z`).toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <>
      {edition && <DailyVisit />}
      <section className="hero">
        <div className="eyebrow">
          <span className="live-dot" /> A DAILY DOSE OF ELSEWHERE
        </div>
        <h1>
          There’s a whole world
          <br />
          beyond <em>your feed.</em>
          <span className="hero-star" aria-hidden>
            ✳
          </span>
        </h1>
        <p>
          Three things worth your curiosity. Chosen by people, not an algorithm.
          <br className="desktop-break" /> Stay a little. Discover something.
          Then get on with your day.
        </p>
        <div className="hero-note">
          <span aria-hidden>↳</span> No endless scroll. No catching up. Just a
          little elsewhere.
        </div>
      </section>
      <section className="edition">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE DAILY EDIT</span>
            <h2>
              Your window to something new<span>.</span>
            </h2>
          </div>
          <div className="edition-date">
            {dateLabel}
            <small>ONE EDITION · EVERYONE’S INVITED · UTC</small>
          </div>
        </div>
        {edition && edition.items.length > 0 ? (
          <>
            <div className="card-grid">
              {edition.items.map((item, index) => (
                <DiscoveryCard key={item.id} item={item} index={index} />
              ))}
            </div>
            {edition.shortfall_reason && (
              <p className="notice">
                A smaller edition today. We only share discoveries that are
                ready.
              </p>
            )}
          </>
        ) : (
          <div className="empty-edition">
            <span className="empty-symbol" aria-hidden>
              ✳
            </span>
            <div>
              <span className="eyebrow">
                {edition ? "GOOD THINGS TAKE A LITTLE CARE" : "A BRIEF PAUSE"}
              </span>
              <h2>
                {edition
                  ? "Our first discoveries are on their way."
                  : "The reading room is taking a moment."}
              </h2>
              <p>
                {edition
                  ? "We’re putting together an edition worth opening. There’s nothing to catch up on. Come back a little later."
                  : "We couldn’t load today’s edition. Please refresh in a moment."}
              </p>
              {!edition && (
                <a className="button" href="/">
                  Try again ↗
                </a>
              )}
            </div>
          </div>
        )}
      </section>
      <section className="ending">
        <span className="ending-icon" aria-hidden>
          ☼
        </span>
        <span className="eyebrow">A LITTLE IS ENOUGH</span>
        <h2>
          That’s all for today.
          <br />
          <em>The rest of the day is yours.</em>
        </h2>
        <p>
          You don’t need to see it all. Take what stays with you.
          <br />
          There’ll be another little window tomorrow.
        </p>
        <span className="closing-rule" />
      </section>
    </>
  );
}
