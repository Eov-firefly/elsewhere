import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page-shell">
      <h1>A little off the beaten path.</h1>
      <p>This page doesn’t exist.</p>
      <Link className="button" href="/">
        Back to today ↗
      </Link>
    </section>
  );
}
