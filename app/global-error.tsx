"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;
  return (
    <html lang="bn">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 44, margin: 0 }}>⚠️</p>
            <h1 style={{ fontSize: 20, margin: "16px 0 8px", color: "#0f172a" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>The site could not load. Please try again.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-block",
                marginTop: 24,
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "#4f46e5",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

