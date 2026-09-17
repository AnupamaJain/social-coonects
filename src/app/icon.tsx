import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon generated from the mark, so it can never drift from the logo. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, background: "#1a1714", borderRadius: 16, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: 5, padding: 10 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: i === 4 ? "#dd7f4d" : "rgba(250,248,245,0.88)" }} />
        ))}
      </div>
    ),
    size,
  );
}
