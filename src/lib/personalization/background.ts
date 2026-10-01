import "server-only";
import sharp from "sharp";

/**
 * Automatic background removal for customer artwork with a solid / near-solid background
 * (logos, illustrations, scans — e.g. a lion on black). Flood-fills from the image border
 * with a colour tolerance, feathers the edge and removes the background colour fringe.
 * Photos with complex backgrounds are left untouched (detected = false).
 */
export async function removeSolidBackground(input: Buffer, opts: { maxSide?: number } = {}) {
  const maxSide = opts.maxSide ?? 2400;
  const { data, info } = await sharp(input).rotate().resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (i: number) => i * 4;

  // 1) sample the border
  const border: number[] = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 1; y < H - 1; y++) border.push(y * W, y * W + W - 1);
  let transparent = 0;
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (const i of border) {
    const p = px(i);
    if (data[p + 3] < 250) transparent++;
    rs.push(data[p]);
    gs.push(data[p + 1]);
    bs.push(data[p + 2]);
  }
  if (transparent / border.length > 0.3) return { detected: false as const, reason: "ALREADY_TRANSPARENT" };
  const median = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1];
  const bg = [median(rs), median(gs), median(bs)];
  const dist = (p: number) => Math.hypot(data[p] - bg[0], data[p + 1] - bg[1], data[p + 2] - bg[2]);
  const HARD = 42, SOFT = 95;
  let near = 0;
  for (const i of border) if (dist(px(i)) <= HARD) near++;
  if (near / border.length < 0.82) return { detected: false as const, reason: "BUSY_BACKGROUND" };

  // 2) flood fill from the border through background-coloured pixels
  const isBg = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0, tail = 0;
  for (const i of border) {
    if (!isBg[i] && dist(px(i)) <= HARD) {
      isBg[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % W, y = (i / W) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (const j of nb) {
      if (j < 0 || isBg[j]) continue;
      if (dist(px(j)) <= HARD) {
        isBg[j] = 1;
        queue[tail++] = j;
      }
    }
  }
  const removed = tail / (W * H);
  if (removed < 0.03) return { detected: false as const, reason: "NOTHING_TO_REMOVE" };

  // 3) cut + feather a 2px edge band (partial alpha by colour distance) and de-fringe
  const band = new Uint8Array(W * H); // 1 = touches background, 2 = next ring
  const touches = (i: number, m: (j: number) => boolean) => {
    const x = i % W, y = (i / W) | 0;
    return (x > 0 && m(i - 1)) || (x < W - 1 && m(i + 1)) || (y > 0 && m(i - W)) || (y < H - 1 && m(i + W));
  };
  for (let i = 0; i < W * H; i++) if (!isBg[i] && touches(i, (j) => isBg[j] === 1)) band[i] = 1;
  for (let i = 0; i < W * H; i++) if (!isBg[i] && !band[i] && touches(i, (j) => band[j] === 1)) band[i] = 2;
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    const p = px(i);
    if (isBg[i]) {
      out[p + 3] = 0;
      continue;
    }
    if (!band[i]) continue;
    const d = dist(p);
    const soft = band[i] === 1 ? SOFT : SOFT * 0.8;
    if (d >= soft) continue;
    const a = Math.max(0.06, (d - HARD) / (soft - HARD));
    for (let c = 0; c < 3; c++) out[p + c] = Math.max(0, Math.min(255, Math.round((data[p + c] - bg[c] * (1 - a)) / a)));
    out[p + 3] = Math.round(data[p + 3] * a);
  }
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  return { detected: true as const, png, width: W, height: H, background: `#${bg.map((v) => v.toString(16).padStart(2, "0")).join("")}`, removed };
}
