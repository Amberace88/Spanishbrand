import { describe, expect, it } from "vitest";
import { leadOrder, orderKidsImages, pickOptionGroups, styleOf, type StyledImage } from "@/lib/fulfillment/mockup-styles";
import { mockupDims, mockupArtUrl, signMockupArt, verifyMockupArt, MOCKUP_ART_MAX } from "@/lib/catalog/mockup-art";
import { classifyObjects, storagePathOf } from "@/lib/storage-report";
import { mockupPending } from "@/lib/fulfillment/catalog-builder";

describe("kids mockup styles", () => {
  it("classifies Printful style labels by flat/ghost/model and gender words only", () => {
    expect(styleOf("Flat")).toBe("flat");
    expect(styleOf("Folded")).toBe("flat");
    expect(styleOf("Ghost")).toBe("ghost");
    expect(styleOf("Girl's Lifestyle")).toBe("girl");
    expect(styleOf("Boy's")).toBe("boy");
    expect(styleOf("Kids'")).toBe("model");
    expect(styleOf("Women's")).toBe("girl");
    expect(styleOf("Men's")).toBe("boy");
    expect(styleOf("Front")).toBe("other");
  });

  it("requests a spread of styles from what the product offers", () => {
    const groups = pickOptionGroups(["Flat", "Flat 2", "Ghost", "Kids'", "Kid's Lifestyle", "Girl's", "Boy's", "On Hanger", "Wrinkled"]);
    expect(groups).toContain("Girl's");
    expect(groups).toContain("Boy's");
    expect(groups).toContain("Flat");
    expect(groups).toContain("Ghost");
    expect(groups.length).toBeLessThanOrEqual(8);
    expect(pickOptionGroups(undefined)).toEqual([]);
  });

  it("rotates the lead style deterministically across designs", () => {
    expect(leadOrder("pequeno-leon:kids")).toEqual(leadOrder("pequeno-leon:kids"));
    const leads = new Set(["pequeno-leon:kids", "pequeno-leon:toddler", "mi-primer-mundial:kids", "mi-primer-mundial:baby", "hecho-en-espana-bebe:baby", "pequeno-leon-noche:kids", "pequeno-leon:baby", "pequeno-leon-noche:toddler"].map((k) => leadOrder(k)[0]));
    expect(leads.size).toBeGreaterThan(1);
  });

  it("puts the design's lead style first and keeps every image", () => {
    const imgs: StyledImage[] = [
      { url: "main", color: "White", kind: "MOCKUP", title: "", style: "other" },
      { url: "boy", color: "White", kind: "LIFESTYLE", title: "", style: "boy" },
      { url: "girl", color: "White", kind: "LIFESTYLE", title: "", style: "girl" },
      { url: "flat", color: "White", kind: "MOCKUP", title: "", style: "flat" },
      { url: "navy", color: "Navy", kind: "MOCKUP", title: "", style: "girl" },
    ];
    for (const key of ["a", "b", "c", "d", "e", "f"]) {
      const out = orderKidsImages(imgs, key);
      expect(out).toHaveLength(imgs.length);
      expect(out[0].color).toBe("White");
      expect(out[0].style).toBe(leadOrder(key).find((s) => ["girl", "boy", "flat", "other"].includes(s)));
    }
  });

  it("maps a Printful task result for a kids tee with varied photos", () => {
    const pending = mockupPending(
      [{ placement: "front", variant_ids: [1], mockup_url: "main", extra: [{ url: "b1", option_group: "Boy's", title: "Front" }, { url: "b2", option_group: "Boy's", title: "Front 2" }, { url: "g1", option_group: "Girl's", title: "Front" }, { url: "f1", option_group: "Flat", title: "Front" }, { url: "back", option_group: "Flat", title: "Back" }] }],
      { White: "1" },
      "p:pequeno-leon:kids",
    );
    const urls = pending.map((p) => p.url);
    expect(urls).toContain("g1");
    expect(urls).toContain("f1");
    expect(urls).not.toContain("back"); // blank back is never shown
    expect(pending[0].style).not.toBe("other");
    expect(pending.find((p) => p.url === "g1")!.kind).toBe("LIFESTYLE");
    // adult products keep the original order
    const adult = mockupPending([{ placement: "front", variant_ids: [1], mockup_url: "main", extra: [{ url: "x", title: "Left" }] }], { Black: "1" }, "p:firma-leon:tee");
    expect(adult[0].url).toBe("main");
  });
});

describe("signed mockup art", () => {
  it("signs and verifies, rejecting tampering", () => {
    const p = { d: "firma-leon", s: "front" as const, m: "print" as const, w: 1200, h: 1600, v: "abc123def456" };
    const sig = signMockupArt(p, "k");
    expect(verifyMockupArt(p, sig, "k")).toBe(true);
    expect(verifyMockupArt({ ...p, d: "otro" }, sig, "k")).toBe(false);
    expect(verifyMockupArt(p, sig, "other-key")).toBe(false);
    expect(verifyMockupArt(p, "nothex", "k")).toBe(false);
  });

  it("scales print sizes down to the mockup maximum, keeping the aspect", () => {
    const d = mockupDims(4500, 5400);
    expect(Math.max(d.w, d.h)).toBe(MOCKUP_ART_MAX);
    expect(d.w / d.h).toBeCloseTo(4500 / 5400, 2);
    expect(mockupDims(800, 600)).toEqual({ w: 800, h: 600 });
  });

  it("builds a .png URL on the site (or nothing without https)", () => {
    process.env.CRON_SECRET = "test-secret";
    const u = mockupArtUrl("https://rojoygualda.com", { d: "firma-leon", s: "front", m: "print", v: "abc", width: 1800, height: 2400 })!;
    expect(u).toMatch(/^https:\/\/rojoygualda\.com\/api\/catalog\/mockup-art\/[0-9a-f]{32}\.png\?/);
    expect(mockupArtUrl("http://localhost:3000", { d: "x", s: "front", m: "print", v: "a", width: 10, height: 10 })).toBeNull();
  });
});

describe("storage report (dry run)", () => {
  it("maps public URLs to bucket paths", () => {
    const base = "https://abc.supabase.co";
    expect(storagePathOf(`${base}/storage/v1/object/public/print-files/catalog/media/x/a%20b.webp?v=1`, base)).toBe("catalog/media/x/a b.webp");
    expect(storagePathOf("https://rojoygualda.com/catalog/art/x.png", base)).toBeNull();
    expect(storagePathOf(null, base)).toBeNull();
  });

  it("separates live, retired-only and orphaned objects", () => {
    const r = classifyObjects(
      [
        { path: "a", bytes: 10 },
        { path: "b", bytes: 20 },
        { path: "c", bytes: 30 },
      ],
      new Set(["a"]),
      new Set(["b"]),
    );
    expect(r.live).toEqual({ count: 1, bytes: 10 });
    expect(r.retiredOnly.count).toBe(1);
    expect(r.orphaned).toMatchObject({ count: 1, bytes: 30, sample: ["c"] });
  });
});
