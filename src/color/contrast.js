/**
 * WCAG 2.x contrast ratio and informational APCA Lc.
 */

import { srgbChannelToLinear } from "./convert.js";

/** @typedef {{ r: number, g: number, b: number, a?: number }} Srgb */

export const WCAG = Object.freeze({
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
  UI: 3,
});

/**
 * Relative luminance (WCAG 2.x), assuming opaque sRGB 0–1.
 * @param {Srgb} color
 * @returns {number}
 */
export function relativeLuminance(color) {
  const r = srgbChannelToLinear(color.r);
  const g = srgbChannelToLinear(color.g);
  const b = srgbChannelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio (1–21). Order-independent.
 * @param {Srgb} a
 * @param {Srgb} b
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {number} ratio
 * @param {number} threshold
 * @returns {boolean}
 */
export function passesThreshold(ratio, threshold) {
  return ratio + 1e-9 >= threshold;
}

/**
 * Evaluate a pair against WCAG thresholds.
 * Default product verdict uses AA normal (4.5:1).
 * @param {Srgb} foreground
 * @param {Srgb} background
 * @param {{ level?: "AA" | "AAA" }} [opts]
 */
export function evaluatePair(foreground, background, opts = {}) {
  const level = opts.level ?? "AA";
  const ratio = contrastRatio(foreground, background);
  const normalThreshold = level === "AAA" ? WCAG.AAA_NORMAL : WCAG.AA_NORMAL;
  const largeThreshold = level === "AAA" ? WCAG.AAA_LARGE : WCAG.AA_LARGE;

  return {
    ratio,
    level,
    normal: passesThreshold(ratio, normalThreshold),
    large: passesThreshold(ratio, largeThreshold),
    ui: passesThreshold(ratio, WCAG.UI),
    thresholds: {
      normal: normalThreshold,
      large: largeThreshold,
      ui: WCAG.UI,
    },
  };
}

/**
 * Soft-clip helper used by APCA (SAPC-0.98G-4g family).
 * @param {number} y
 * @param {number} soft
 * @returns {number}
 */
function softClamp(y, soft) {
  if (y >= soft) return y;
  return y + (soft - y) ** 2 / (2 * soft);
}

/**
 * Informational APCA Lc (Lightness contrast).
 * Implementation aligned with the public SAPC-0.98G-4g constants.
 * Not used for pass/fail — WCAG 2.x remains the verdict.
 *
 * @param {Srgb} text  foreground (text)
 * @param {Srgb} background
 * @returns {number} Lc (signed; abs value is magnitude)
 */
export function apcaContrast(text, background) {
  // Constants from APCA W3 draft / SAPC-0.98G-4g
  const mainTRC = 2.4;
  const normBG = 0.56;
  const normTXT = 0.57;
  const revTXT = 0.62;
  const revBG = 0.65;
  const scaleBoW = 1.14;
  const scaleWoB = 1.14;
  const loBoWoffset = 0.027;
  const loWoBoffset = 0.027;
  const loClip = 0.1;
  const deltaYmin = 0.0005;
  const softClip = 0.022;

  const Rco = 0.2126729;
  const Gco = 0.7151522;
  const Bco = 0.072175;

  const yFromSrgb = (c) =>
    Rco * c.r ** mainTRC + Gco * c.g ** mainTRC + Bco * c.b ** mainTRC;

  let yTxt = softClamp(yFromSrgb(text), softClip);
  let yBg = softClamp(yFromSrgb(background), softClip);

  if (Math.abs(yBg - yTxt) < deltaYmin) return 0;

  let sapc;
  let outputOffset;
  let scale;

  // Normal polarity: dark text on light background
  if (yBg > yTxt) {
    sapc = (yBg ** normBG - yTxt ** normTXT) * scaleBoW;
    outputOffset = loBoWoffset;
    scale = scaleBoW;
  } else {
    sapc = (yBg ** revBG - yTxt ** revTXT) * scaleWoB;
    outputOffset = loWoBoffset;
    scale = scaleWoB;
  }

  // Soft clamp low-contrast noise
  let lc;
  if (Math.abs(sapc) < loClip) {
    lc = 0;
  } else if (sapc > 0) {
    lc = sapc - outputOffset;
  } else {
    lc = sapc + outputOffset;
  }

  // Scale to percent-like Lc
  return lc * 100;
}

/**
 * Format ratio for display, e.g. "4.48:1".
 * @param {number} ratio
 * @param {number} [digits=2]
 * @returns {string}
 */
export function formatRatio(ratio, digits = 2) {
  return `${ratio.toFixed(digits)}:1`;
}
