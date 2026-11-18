/**
 * Color space conversions: sRGB ↔ linear RGB ↔ OKLab ↔ OKLCH.
 * OKLab/OKLCH math follows Björn Ottosson (CSS Color Module Level 4).
 */

/** @typedef {{ r: number, g: number, b: number, a?: number }} Srgb */
/** @typedef {{ l: number, a: number, b: number, alpha?: number }} Oklab */
/** @typedef {{ l: number, c: number, h: number, alpha?: number }} Oklch */

/**
 * sRGB channel 0–1 → linear light.
 * @param {number} c
 * @returns {number}
 */
export function srgbChannelToLinear(c) {
  const abs = Math.abs(c);
  if (abs <= 0.04045) return c / 12.92;
  return (Math.sign(c) || 1) * ((abs + 0.055) / 1.055) ** 2.4;
}

/**
 * Linear light → sRGB channel 0–1.
 * @param {number} c
 * @returns {number}
 */
export function linearToSrgbChannel(c) {
  const abs = Math.abs(c);
  if (abs <= 0.0031308) return 12.92 * c;
  return (Math.sign(c) || 1) * (1.055 * abs ** (1 / 2.4) - 0.055);
}

/**
 * @param {Srgb} color
 * @returns {{ r: number, g: number, b: number, a?: number }}
 */
export function srgbToLinear(color) {
  return {
    r: srgbChannelToLinear(color.r),
    g: srgbChannelToLinear(color.g),
    b: srgbChannelToLinear(color.b),
    a: color.a,
  };
}

/**
 * @param {{ r: number, g: number, b: number, a?: number }} color
 * @returns {Srgb}
 */
export function linearToSrgb(color) {
  return {
    r: linearToSrgbChannel(color.r),
    g: linearToSrgbChannel(color.g),
    b: linearToSrgbChannel(color.b),
    a: color.a,
  };
}

/**
 * Linear sRGB → OKLab.
 * @param {{ r: number, g: number, b: number, a?: number }} linear
 * @returns {Oklab}
 */
export function linearToOklab(linear) {
  const l =
    0.4122214708 * linear.r +
    0.5363325363 * linear.g +
    0.0514459929 * linear.b;
  const m =
    0.2119034982 * linear.r +
    0.6806995451 * linear.g +
    0.1073969566 * linear.b;
  const s =
    0.0883024619 * linear.r +
    0.2817188376 * linear.g +
    0.6299787005 * linear.b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    alpha: linear.a,
  };
}

/**
 * OKLab → linear sRGB.
 * @param {Oklab} lab
 * @returns {{ r: number, g: number, b: number, a?: number }}
 */
export function oklabToLinear(lab) {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    a: lab.alpha,
  };
}

/**
 * @param {Srgb} color
 * @returns {Oklab}
 */
export function srgbToOklab(color) {
  return linearToOklab(srgbToLinear(color));
}

/**
 * @param {Oklab} lab
 * @returns {Srgb}
 */
export function oklabToSrgb(lab) {
  return linearToSrgb(oklabToLinear(lab));
}

/**
 * @param {Oklab} lab
 * @returns {Oklch}
 */
export function oklabToOklch(lab) {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h: c < 1e-8 ? 0 : h, alpha: lab.alpha };
}

/**
 * @param {Oklch} lch
 * @returns {Oklab}
 */
export function oklchToOklab(lch) {
  const hRad = (lch.h * Math.PI) / 180;
  return {
    l: lch.l,
    a: lch.c * Math.cos(hRad),
    b: lch.c * Math.sin(hRad),
    alpha: lch.alpha,
  };
}

/**
 * @param {Srgb} color
 * @returns {Oklch}
 */
export function srgbToOklch(color) {
  return oklabToOklch(srgbToOklab(color));
}

/**
 * @param {Oklch} lch
 * @returns {Srgb}
 */
export function oklchToSrgb(lch) {
  return oklabToSrgb(oklchToOklab(lch));
}

/**
 * Clamp a channel to [0, 1].
 * @param {number} n
 * @returns {number}
 */
export function clamp01(n) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * True if all linear (or sRGB) channels are inside [0, 1] within epsilon.
 * @param {{ r: number, g: number, b: number }} color
 * @param {number} [epsilon=1e-4]
 * @returns {boolean}
 */
export function isInSrgbGamut(color, epsilon = 1e-4) {
  return (
    color.r >= -epsilon &&
    color.r <= 1 + epsilon &&
    color.g >= -epsilon &&
    color.g <= 1 + epsilon &&
    color.b >= -epsilon &&
    color.b <= 1 + epsilon
  );
}

/**
 * Clamp OKLCH into sRGB by reducing chroma (binary search), keeping L and H.
 * @param {Oklch} lch
 * @returns {Srgb}
 */
export function oklchToSrgbClamped(lch) {
  let low = 0;
  let high = lch.c;
  let best = { ...lch, c: 0 };

  // If already in gamut, return directly (still clamp channels for safety).
  const direct = oklchToSrgb(lch);
  if (isInSrgbGamut(direct)) {
    return {
      r: clamp01(direct.r),
      g: clamp01(direct.g),
      b: clamp01(direct.b),
      a: lch.alpha,
    };
  }

  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const candidate = { ...lch, c: mid };
    const rgb = oklchToSrgb(candidate);
    if (isInSrgbGamut(rgb)) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  const out = oklchToSrgb(best);
  return {
    r: clamp01(out.r),
    g: clamp01(out.g),
    b: clamp01(out.b),
    a: lch.alpha,
  };
}

/**
 * Format sRGB 0–1 as #RRGGBB or #RRGGBBAA.
 * @param {Srgb} color
 * @returns {string}
 */
export function srgbToHex(color) {
  const toByte = (c) =>
    Math.round(clamp01(c) * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${toByte(color.r)}${toByte(color.g)}${toByte(color.b)}`;
  if (color.a !== undefined && color.a < 1) {
    return `${hex}${toByte(color.a)}`;
  }
  return hex;
}
