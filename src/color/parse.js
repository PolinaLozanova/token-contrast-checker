/**
 * Parse CSS color strings into normalized sRGB 0–1 (+ optional alpha).
 * Supports: #RGB #RGBA #RRGGBB #RRGGBBAA, rgb()/rgba(), hsl()/hsla(), oklch().
 */

import {
  clamp01,
  oklchToSrgbClamped,
  srgbToHex,
} from "./convert.js";

/** @typedef {{ r: number, g: number, b: number, a: number }} ParsedColor */

/**
 * @param {string} input
 * @returns {number} 0–1
 */
function parseAlpha(input) {
  const t = input.trim();
  if (t.endsWith("%")) return clamp01(parseFloat(t) / 100);
  return clamp01(parseFloat(t));
}

/**
 * @param {string} input
 * @param {"number" | "percent"} hint
 * @returns {number} 0–1 for RGB channels when percent/number in rgb()
 */
function parseRgbChannel(input, hint = "number") {
  const t = input.trim();
  if (t.endsWith("%")) return clamp01(parseFloat(t) / 100);
  if (hint === "percent") return clamp01(parseFloat(t) / 100);
  return clamp01(parseFloat(t) / 255);
}

/**
 * @param {string} input
 * @returns {number} degrees 0–360
 */
function parseHue(input) {
  const t = input.trim().toLowerCase();
  const n = parseFloat(t);
  if (Number.isNaN(n)) throw new Error(`Invalid hue: ${input}`);
  if (t.endsWith("turn")) return ((n * 360) % 360 + 360) % 360;
  if (t.endsWith("rad")) return (((n * 180) / Math.PI) % 360 + 360) % 360;
  if (t.endsWith("grad")) return ((n * 0.9) % 360 + 360) % 360;
  return ((n % 360) + 360) % 360;
}

/**
 * HSL (0–1 s/l, hue degrees) → sRGB 0–1.
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {{ r: number, g: number, b: number }}
 */
export function hslToSrgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

/**
 * Composite a source color over an opaque background (Porter-Duff "over").
 * @param {ParsedColor} foreground
 * @param {ParsedColor} background  treated as opaque
 * @returns {ParsedColor}
 */
export function compositeOver(foreground, background) {
  const a = foreground.a;
  if (a >= 1) return { ...foreground, a: 1 };
  if (a <= 0) return { r: background.r, g: background.g, b: background.b, a: 1 };
  return {
    r: foreground.r * a + background.r * (1 - a),
    g: foreground.g * a + background.g * (1 - a),
    b: foreground.b * a + background.b * (1 - a),
    a: 1,
  };
}

/**
 * @param {string} hex
 * @returns {ParsedColor}
 */
function parseHex(hex) {
  const h = hex.slice(1);
  let r;
  let g;
  let b;
  let a = 1;

  if (h.length === 3 || h.length === 4) {
    r = parseInt(h[0] + h[0], 16) / 255;
    g = parseInt(h[1] + h[1], 16) / 255;
    b = parseInt(h[2] + h[2], 16) / 255;
    if (h.length === 4) a = parseInt(h[3] + h[3], 16) / 255;
  } else if (h.length === 6 || h.length === 8) {
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else {
    throw new Error(`Unsupported hex color: ${hex}`);
  }

  if ([r, g, b, a].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b, a };
}

/**
 * @param {string} raw
 * @returns {ParsedColor}
 */
function parseRgbFunction(raw) {
  const body = raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")).trim();
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) throw new Error(`Invalid rgb() color: ${raw}`);

  const r = parseRgbChannel(parts[0]);
  const g = parseRgbChannel(parts[1]);
  const b = parseRgbChannel(parts[2]);
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  return { r, g, b, a };
}

/**
 * @param {string} raw
 * @returns {ParsedColor}
 */
function parseHslFunction(raw) {
  const body = raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")).trim();
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) throw new Error(`Invalid hsl() color: ${raw}`);

  const h = parseHue(parts[0]);
  const s = parts[1].endsWith("%")
    ? clamp01(parseFloat(parts[1]) / 100)
    : clamp01(parseFloat(parts[1]));
  const l = parts[2].endsWith("%")
    ? clamp01(parseFloat(parts[2]) / 100)
    : clamp01(parseFloat(parts[2]));
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;
  const rgb = hslToSrgb(h, s, l);
  return { ...rgb, a };
}

/**
 * @param {string} raw
 * @returns {ParsedColor}
 */
function parseOklchFunction(raw) {
  const body = raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")).trim();
  // Split on space/slash but keep hue units attached
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) throw new Error(`Invalid oklch() color: ${raw}`);

  let l = parseFloat(parts[0]);
  if (parts[0].endsWith("%")) l = l / 100;
  // CSS oklch L is 0–1 (or 0%–100%)
  l = clamp01(l);

  const c = Math.max(0, parseFloat(parts[1]));
  const h = parseHue(parts[2]);
  const a = parts[3] !== undefined ? parseAlpha(parts[3]) : 1;

  const rgb = oklchToSrgbClamped({ l, c, h, alpha: a });
  return { r: rgb.r, g: rgb.g, b: rgb.b, a };
}

/**
 * Parse a CSS color string into normalized sRGB.
 * @param {string} input
 * @returns {ParsedColor}
 */
export function parseColor(input) {
  if (input == null || typeof input !== "string") {
    throw new Error("Color value must be a string");
  }

  const value = input.trim();
  if (!value) throw new Error("Empty color value");

  const lower = value.toLowerCase();

  if (lower === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (lower.startsWith("#")) {
    return parseHex(lower);
  }

  if (lower.startsWith("rgba(") || lower.startsWith("rgb(")) {
    return parseRgbFunction(lower);
  }

  if (lower.startsWith("hsla(") || lower.startsWith("hsl(")) {
    return parseHslFunction(lower);
  }

  if (lower.startsWith("oklch(")) {
    return parseOklchFunction(lower);
  }

  throw new Error(`Unsupported color format: ${value}`);
}

/**
 * Try parse; return null instead of throwing.
 * @param {string} input
 * @returns {ParsedColor | null}
 */
export function tryParseColor(input) {
  try {
    return parseColor(input);
  } catch {
    return null;
  }
}

/**
 * Normalize any supported color string to #RRGGBB(AA).
 * @param {string} input
 * @returns {string}
 */
export function normalizeToHex(input) {
  const c = parseColor(input);
  return srgbToHex(c);
}
