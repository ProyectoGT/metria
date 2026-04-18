export default function OfflinePage() {
  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", padding: "40px 24px", maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0112 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0122 15c0 1.65-1.35 3-3 3zM8 13h2.55v3h2.9v-3H16l-4-4-4 4z" fill="#2563eb"/>
          </svg>
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#09090b" }}>
          Sin conexion
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 15, color: "#71717a", lineHeight: 1.6 }}>
          No hay conexion a internet. Comprueba tu red y vuelve a intentarlo.
        </p>

        <a
          href="/"
          style={{ display: "inline-block", backgroundColor: "#2563eb", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 28px", borderRadius: 8, textDecoration: "none" }}
        >
          Reintentar
        </a>

        <p style={{ marginTop: 32, fontSize: 13, color: "#a1a1aa" }}>
          Metria CRM · Master Iberica
        </p>
      </div>
    </div>
  );
}
