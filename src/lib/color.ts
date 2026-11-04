/**
 * 色の計算（Java版の android.graphics.Color と同じ計算）。色は '#RRGGBB' の文字であつかう
 */
export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Java の 0xAARRGGBB の数字を '#RRGGBB' にする */
export const argb = (n: number) => rgbToHex([(n >> 16) & 255, (n >> 8) & 255, n & 255]);

/** 色 → [色相 0〜360, 彩度 0〜1, 明るさ 0〜1] */
export function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as RGB;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

/** [色相, 彩度, 明るさ] → 色 */
export function hsvToHex(h: number, s: number, v: number): string {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  let rgb: RGB;
  if (hh < 1) rgb = [c, x, 0];
  else if (hh < 2) rgb = [x, c, 0];
  else if (hh < 3) rgb = [0, c, x];
  else if (hh < 4) rgb = [0, x, c];
  else if (hh < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex(rgb.map((t) => (t + m) * 255) as RGB);
}
