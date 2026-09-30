import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/brand";

export const alt = "Brand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const brand = await getBrand();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#0b0b0c", color: "#f4efe6", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", left: 420, top: 180, width: 560, height: 560, borderRadius: 9999, background: "radial-gradient(circle at 50% 42%, #f0c77a 0%, #d7662f 34%, #b3122e 58%, rgba(94,10,24,0) 72%)" }} />
        <div style={{ fontSize: 26, letterSpacing: 10, color: "#c9ad76", textTransform: "uppercase" }}>{brand.tagline}</div>
        <div style={{ fontSize: 160, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>{brand.name}</div>
      </div>
    ),
    size,
  );
}
