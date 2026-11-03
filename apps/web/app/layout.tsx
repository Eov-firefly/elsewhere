import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.FRONTEND_PUBLIC_URL || "http://localhost:3000",
  ),
  title: {
    default: "Elsewhere — A little beyond your everyday",
    template: "%s — Elsewhere",
  },
  description:
    "Three discoveries, chosen with care. Something to wonder about, without an endless feed.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="wordmark" aria-label="Elsewhere home">
            elsewhere<span>✳</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">Today’s edition</Link>
            <Link href="/saved">
              Your collection <span aria-hidden>↗</span>
            </Link>
            <Link href="/journal">Your journal</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <Link className="wordmark" href="/">
            elsewhere<span>✳</span>
          </Link>
          <p>A little curiosity. A little perspective. Then, back to life.</p>
          <Link href="/preferences">Privacy & preferences</Link>
          <Link href="/admin">Editor’s desk</Link>
          <span className="footer-note">Made for humans, not algorithms.</span>
        </footer>
      </body>
    </html>
  );
}
