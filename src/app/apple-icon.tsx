import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, background: "#1a1714", display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: 14, padding: 30 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: i === 4 ? "#dd7f4d" : "rgba(250,248,245,0.88)" }} />
        ))}
      </div>
    ),
    size,
  );
}
