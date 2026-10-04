import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { detectPrintBox, fitPrintBox } from "@/components/home/teeGeometry";

/** Synthetic flat-lay: folded white tee (collar at the top centre) on a wood-coloured ground. */
function teeSvg(W: number, H: number, ox: number, oy: number, s: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#93694a"/>
  ${Array.from({ length: 24 }).map((_, i) => `<rect x="0" y="${i * (H / 24)}" width="${W}" height="3" fill="#5a3f28" opacity=".3"/>`).join("")}
  <g transform="translate(${ox} ${oy}) scale(${s})">
    <path d="M190 210 L360 160 Q512 250 664 160 L834 210 L860 330 L840 940 Q840 960 820 960 L204 960 Q184 960 184 940 L164 330 Z" fill="#f6f4ee"/>
    <path d="M360 160 Q512 290 664 160 Q640 205 512 215 Q384 205 360 160 Z" fill="#d9d4c9"/>
    <path d="M396 172 Q512 236 628 172 Q560 196 512 198 Q464 196 396 172 Z" fill="#b9b2a4"/>
  </g></svg>`;
}

async function pixels(svg: string, N = 256) {
  const img = sharp(Buffer.from(svg));
  const m = await img.metadata();
  const s = Math.min(m.width!, m.height!);
  const { data } = await sharp(Buffer.from(svg))
    .extract({ left: Math.floor((m.width! - s) / 2), top: Math.floor((m.height! - s) / 2), width: s, height: s })
    .resize(N, N)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8ClampedArray(data);
}

describe("homepage tile: print box measured on the tee photo", () => {
  it("centres the box on the body, just under the collar", async () => {
    // square photo: tee body x 252…948 (centre 50 %), collar bottom ≈ 215 px of 1200 (≈ 18 %)
    const box = await detectPrintBox(await pixels(teeSvg(1200, 1200, 88, 40, 1)), 256);
    expect(box).not.toBeNull();
    const b = box!;
    expect(Math.abs(b.left + b.width / 2 - 50)).toBeLessThan(2);
    expect(b.top).toBeGreaterThan(19); // below the collar
    expect(b.top).toBeLessThan(27); // …but on the chest, not the belly
    expect(b.height / b.width).toBeCloseTo(4 / 3, 1);
  });

  it("works on a wide photo shown cover-cropped and returns null without a garment", async () => {
    const wide = await detectPrintBox(await pixels(teeSvg(1600, 1100, 360, -10, 1.05)), 256);
    expect(wide).not.toBeNull();
    // tee centre: (360 + 512 × 1.05 − 250) / 1100 ≈ 58.9 % of the centred square crop
    expect(Math.abs(wide!.left + wide!.width / 2 - 58.9)).toBeLessThan(2);
    const none = detectPrintBox(await pixels(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#7a5a3c"/></svg>`), 256);
    expect(none).toBeNull();
  });
});

describe("homepage tile: print box fitted above the controls", () => {
  const BOX = { left: 39.5, top: 32, width: 25, height: 30 };
  const frame = (W: number, H: number, ctrl: number) => {
    const S = Math.max(W, H);
    const r = fitPrintBox(W, H, ctrl, BOX);
    const top = (H - S) / 2 + r.dy + (BOX.top / 100) * S;
    return { r, top, bottom: top + (BOX.height / 100) * S * r.scale * 1.03 };
  };

  it("leaves a roomy tile untouched (centred crop, full size)", () => {
    const r = fitPrintBox(400, 640, 150, BOX);
    expect(r.dy).toBe(0);
    expect(r.scale).toBe(1);
  });

  it("raises the photo, then shrinks the box, so it ends above the controls on a short wide tile (1366×768)", () => {
    const { r, top, bottom } = frame(434, 334, 186);
    expect(r.dy).toBeLessThan(0);
    expect(r.scale).toBeLessThan(1);
    expect(bottom).toBeLessThanOrEqual(334 - 186);
    expect(top).toBeGreaterThan(0);
  });

  it("never moves the photo past its cover crop", () => {
    const r = fitPrintBox(434, 300, 220, BOX);
    expect(Math.abs(r.dy)).toBeLessThanOrEqual((434 - 300) / 2 + 0.001);
  });
});
