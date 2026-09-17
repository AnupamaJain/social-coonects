import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.shortTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The six-cell mark at poster scale, so shares look like the brand, not a screenshot. */
export default function OpenGraphImage() {
  const cells = Array.from({ length: 6 }, (_, i) => i);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          background: "#faf8f5", color: "#1a1714",
          padding: 72, fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", width: 72, height: 72, background: "#1a1714", borderRadius: 18, padding: 12, gap: 6 }}>
              {cells.map((i) => (
                <div key={i} style={{ width: 15, height: 15, borderRadius: 4, background: i === 4 ? "#dd7f4d" : "rgba(250,248,245,0.85)" }} />
              ))}
            </div>
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>Sixfold</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2.5, maxWidth: 980 }}>
              Run your social media on autopilot,
            </div>
            <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2.5, color: "#c85f2a" }}>
              in your own voice.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 26, color: "#7d7365", maxWidth: 720, lineHeight: 1.35 }}>
              Scores every draft before you publish. Learns which six of your 180 posts actually worked.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[28, 87].map((n, i) => (
                <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 96, height: 96, borderRadius: 48, border: `8px solid ${i ? "#3f7a4f" : "#b4472f"}`, fontSize: 38, fontWeight: 700, fontFamily: "Georgia, serif" }}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
