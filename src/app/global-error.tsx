"use client";

/**
 * Last resort: catches failures in the root layout itself, where the normal
 * error boundary has no shell to render into. It must ship its own <html>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#0c0c10",
          color: "#f2f2f5",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Sixfold is having a problem</h1>
          <p style={{ color: "#8e8ea0", marginTop: 8, fontSize: 14 }}>
            {error.digest ? `Reference ${error.digest}` : "Please try again."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24, padding: "10px 20px", borderRadius: 8,
              border: 0, background: "#6d28d9", color: "white",
              fontSize: 14, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
