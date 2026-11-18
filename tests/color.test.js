import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compositeOver,
  contrastRatio,
  evaluatePair,
  normalizeToHex,
  parseColor,
  relativeLuminance,
  srgbToOklch,
  oklchToSrgbClamped,
  WCAG,
} from "../src/color/index.js";

describe("parseColor", () => {
  it("parses 6-digit hex", () => {
    const c = parseColor("#777777");
    assert.equal(c.r.toFixed(6), (119 / 255).toFixed(6));
    assert.equal(c.a, 1);
  });

  it("parses 3-digit and 4-digit hex", () => {
    assert.deepEqual(parseColor("#fff"), { r: 1, g: 1, b: 1, a: 1 });
    const withAlpha = parseColor("#f008");
    assert.equal(withAlpha.r, 1);
    assert.equal(withAlpha.g, 0);
    assert.equal(withAlpha.b, 0);
    assert.equal(withAlpha.a, 0x88 / 255);
  });

  it("parses 8-digit hex", () => {
    const c = parseColor("#ff000080");
    assert.equal(c.r, 1);
    assert.equal(c.g, 0);
    assert.equal(c.b, 0);
    assert.ok(Math.abs(c.a - 128 / 255) < 1e-6);
  });

  it("parses rgb and rgba", () => {
    const c = parseColor("rgb(119, 119, 119)");
    assert.ok(Math.abs(c.r - 119 / 255) < 1e-6);
    const a = parseColor("rgba(0, 0, 0, 0.5)");
    assert.equal(a.a, 0.5);
  });

  it("parses hsl", () => {
    const c = parseColor("hsl(0 0% 0%)");
    assert.ok(c.r < 1e-6 && c.g < 1e-6 && c.b < 1e-6);
    const white = parseColor("hsl(0, 0%, 100%)");
    assert.ok(white.r > 0.99 && white.g > 0.99 && white.b > 0.99);
  });

  it("parses oklch black and white", () => {
    const black = parseColor("oklch(0 0 0)");
    assert.ok(black.r < 0.02 && black.g < 0.02 && black.b < 0.02);
    const white = parseColor("oklch(1 0 0)");
    assert.ok(white.r > 0.98 && white.g > 0.98 && white.b > 0.98);
  });

  it("rejects unsupported formats", () => {
    assert.throws(() => parseColor("blue"), /Unsupported/);
    assert.throws(() => parseColor(""), /Empty/);
  });
});

describe("compositeOver", () => {
  it("composites semi-transparent black over white", () => {
    const fg = { r: 0, g: 0, b: 0, a: 0.5 };
    const bg = { r: 1, g: 1, b: 1, a: 1 };
    const out = compositeOver(fg, bg);
    assert.ok(Math.abs(out.r - 0.5) < 1e-6);
    assert.equal(out.a, 1);
  });
});

describe("WCAG contrast", () => {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 1, g: 1, b: 1, a: 1 };
  const gray777 = parseColor("#777777");

  it("black on white is 21:1", () => {
    assert.equal(contrastRatio(black, white).toFixed(2), "21.00");
  });

  it("#777 on white is about 4.48:1", () => {
    const ratio = contrastRatio(gray777, white);
    assert.ok(
      Math.abs(ratio - 4.48) < 0.02,
      `expected ~4.48, got ${ratio}`,
    );
  });

  it("relative luminance of white is 1 and black is 0", () => {
    assert.equal(relativeLuminance(white), 1);
    assert.equal(relativeLuminance(black), 0);
  });

  it("evaluatePair uses AA 4.5 by default", () => {
    const pass = evaluatePair(black, white);
    assert.equal(pass.level, "AA");
    assert.equal(pass.thresholds.normal, WCAG.AA_NORMAL);
    assert.equal(pass.normal, true);

    const borderline = evaluatePair(gray777, white);
    // ~4.48 is just under 4.5 → fail AA normal
    assert.equal(borderline.normal, false);
    assert.equal(borderline.large, true);
    assert.equal(borderline.ui, true);
  });

  it("evaluatePair AAA uses 7:1 for normal text", () => {
    const result = evaluatePair(black, white, { level: "AAA" });
    assert.equal(result.thresholds.normal, WCAG.AAA_NORMAL);
    assert.equal(result.normal, true);
  });
});

describe("OKLCH round-trip", () => {
  it("keeps mid gray recognizable after clamp", () => {
    const gray = parseColor("#808080");
    const lch = srgbToOklch(gray);
    const back = oklchToSrgbClamped(lch);
    assert.ok(Math.abs(back.r - gray.r) < 0.02);
    assert.ok(Math.abs(back.g - gray.g) < 0.02);
    assert.ok(Math.abs(back.b - gray.b) < 0.02);
  });

  it("normalizeToHex round-trips hex", () => {
    assert.equal(normalizeToHex("#8746ff").toLowerCase(), "#8746ff");
  });
});
