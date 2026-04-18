import * as React from "react";

interface BaseEmailProps {
  previewText?: string;
  children: React.ReactNode;
}

export function BaseEmail({ previewText, children }: BaseEmailProps) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {previewText && (
          <div
            style={{
              display: "none",
              overflow: "hidden",
              lineHeight: "1px",
              opacity: 0,
              maxHeight: 0,
              maxWidth: 0,
            }}
          >
            {previewText}
          </div>
        )}
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f5f5f5",
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}
      >
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: "#f5f5f5", padding: "40px 0" }}
        >
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding={0}
                cellSpacing={0}
                style={{
                  maxWidth: 600,
                  width: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#1a56db",
                      padding: "24px 40px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      Metria CRM
                    </span>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "32px 40px" }}>{children}</td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#f9fafb",
                      borderTop: "1px solid #e5e7eb",
                      padding: "20px 40px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#9ca3af",
                        lineHeight: "1.5",
                      }}
                    >
                      Master Iberica · Metria CRM
                      <br />
                      Este mensaje es automatico, no respondas a este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ margin: "24px 0" }}>
      <tr>
        <td
          style={{
            backgroundColor: "#1a56db",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <a
            href={href}
            style={{
              display: "inline-block",
              padding: "12px 28px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {children}
          </a>
        </td>
      </tr>
    </table>
  );
}

export function EmailText({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        fontSize: 15,
        color: "#374151",
        lineHeight: "1.6",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        margin: "0 0 20px",
        fontSize: 22,
        fontWeight: 700,
        color: "#111827",
        lineHeight: "1.3",
      }}
    >
      {children}
    </h1>
  );
}
