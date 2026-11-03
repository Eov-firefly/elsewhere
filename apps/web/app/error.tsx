"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="page-shell">
      <h1>A brief pause.</h1>
      <p>Something went wrong while opening this page.</p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
