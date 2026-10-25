import { ImageResponse } from "next/og";

export const alt = "Devora AI — Your AI Coding Partner. Right on Your Desktop.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Open Graph image generated at serve-time (no binary asset needed). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              border: "2px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            D
          </div>
          <div style={{ fontSize: 52, fontWeight: 600, color: "#ffffff" }}>
            Devora
          </div>
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 38,
            color: "rgba(255,255,255,0.75)",
            display: "flex",
          }}
        >
          Your AI Coding Partner. Right on Your Desktop.
        </div>
      </div>
    ),
    size
  );
}
