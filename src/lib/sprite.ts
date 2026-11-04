import { PaintStyle, Skia, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

import type { Look } from '@/state/character';

/**
 * 主人公のドット絵をかく係（Java版の CharacterSprite の draw の部分）。
 * 絵の大きさ（ドット）：横18・縦48。先生と同じくらいの等身
 *   drawHero(canvas, look, x, y, scale, direction, walkFrame)
 *     direction：0 正面、1 右、2 後ろ、3 左
 *     walkFrame：0=直立, 1=左足を出す, 2=右足を出す
 */
export const SPRITE_W = 18;
export const SPRITE_H = 48;

export const FRONT = 0;
export const RIGHT = 1;
export const BACK = 2;
export const LEFT = 3;

// ---- 色の計算（'#RRGGBB' の文字で受けて、[r,g,b] で計算する） ----
type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const css = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;

/** 色を k 倍に暗くする */
function dark(hex: string, k = 0.75): string {
  const [r, g, b] = rgb(hex);
  return css([Math.trunc(r * k), Math.trunc(g * k), Math.trunc(b * k)]);
}

/** 髪のつや用に、色を明るくする */
function light(hex: string): string {
  const [r, g, b] = rgb(hex);
  const f = (v: number) => Math.min(255, Math.trunc(v * 1.35 + 20));
  return css([f(r), f(g), f(b)]);
}

const SHADOW = 'rgba(80,95,104,0.4)'; // 地面の影
const SOLE = '#CCCCCC'; // くつの底
const EYE_DARK = 'rgb(35,39,50)';
const INNER = 'rgb(224,227,230)'; // ジャケットの中の服
const WHITE = '#FFFFFF';
const LENS = 'rgba(32,38,46,0.4)'; // サングラスのレンズ

let rectPaint: SkPaint | null = null;
let linePaint: SkPaint | null = null;

/** 主人公をかく。x・y は左上、scale は1ドットの大きさ */
export function drawHero(
  canvas: SkCanvas,
  look: Look,
  x: number,
  y: number,
  scale: number,
  direction: number,
  walkFrame = 0,
) {
  if (!rectPaint) {
    rectPaint = Skia.Paint();
    rectPaint.setAntiAlias(false);
    linePaint = Skia.Paint();
    linePaint.setAntiAlias(true);
    linePaint.setStyle(PaintStyle.Stroke); // 線
    linePaint.setStrokeWidth(0.5);
  }
  const frame = walkFrame === 1 || walkFrame === 2 ? walkFrame : 0;
  const dir = ((direction % 4) + 4) % 4;

  const rect = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    rectPaint!.setColor(Skia.Color(color));
    canvas.drawRect(Skia.XYWHRect(x1, y1, x2 - x1, y2 - y1), rectPaint!);
  };
  const thinLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    linePaint!.setColor(Skia.Color(color));
    canvas.drawLine(x1, y1, x2, y2, linePaint!);
  };

  canvas.save();
  canvas.translate(x, y);
  canvas.scale(scale, scale);
  if (dir === RIGHT || dir === LEFT) {
    // 左向きは、右向きの絵を左右反転する
    if (dir === LEFT) {
      canvas.translate(SPRITE_W, 0);
      canvas.scale(-1, 1);
    }
    drawSide(look, frame, rect, thinLine);
  } else {
    drawFrontBack(look, dir === BACK, frame, rect, thinLine);
  }
  canvas.restore();
}

type RectFn = (x1: number, y1: number, x2: number, y2: number, color: string) => void;

// 正面・後ろ向き
function drawFrontBack(L: Look, back: boolean, frame: number, rect: RectFn, thinLine: RectFn) {
  const { hair, skin, shirt, pants, shoes, eyes } = L;
  // 足を交互に1ドットずらす（腕は足と逆）
  const lf = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const rf = -lf;

  rect(3, 46, 15, 47, SHADOW);

  // ズボン・スカート
  if (L.pantsStyle === 0) {
    rect(5, 29, 9, 44 + lf, pants);
    rect(9, 29, 13, 44 + rf, dark(pants));
  } else {
    rect(5, 35, 8, 44 + lf, skin);
    rect(10, 35, 13, 44 + rf, skin);
    rect(4, 29, 14, 35, pants);
    rect(3, 32, 15, 35, pants);
    rect(4, 34, 14, 35, dark(pants));
  }

  // くつ
  rect(4, 42 + lf, 9, 46 + lf, shoes);
  rect(9, 42 + rf, 14, 46 + rf, shoes);
  rect(4, 45 + lf, 9, 46 + lf, SOLE);
  rect(9, 45 + rf, 14, 46 + rf, SOLE);

  // 上着
  rect(4, 15, 14, 30, shirt);
  rect(11, 16, 13, 29, dark(shirt));
  if (L.shirtStyle === 0) {
    // Tシャツ：半そで
    rect(2, 16, 4, 21, shirt);
    rect(14, 16, 16, 21, shirt);
    rect(2, 21, 4, 28 - lf, skin);
    rect(14, 21, 16, 28 - rf, skin);
  } else {
    // パーカー・ジャケット：長そで
    rect(2, 16, 4, 27 - lf, shirt);
    rect(14, 16, 16, 27 - rf, shirt);
    rect(2, 27 - lf, 4, 29 - lf, skin);
    rect(14, 27 - rf, 16, 29 - rf, skin);
  }
  // ジャケットの前開き
  if (L.shirtStyle === 2 && !back) {
    rect(8, 16, 10, 29, INNER);
    rect(7, 16, 8, 21, dark(shirt));
    rect(10, 16, 11, 21, dark(shirt));
  }
  // パーカー：前はひも、後ろはフード
  if (L.shirtStyle === 1) {
    if (back) {
      rect(5, 15, 13, 20, dark(shirt));
      rect(6, 16, 12, 19, shirt);
    } else {
      rect(5, 15, 13, 16, dark(shirt));
      rect(7, 16, 8, 20, WHITE);
      rect(10, 16, 11, 20, WHITE);
    }
  }

  // 首
  rect(8, 13, 10, 16, skin);

  // 頭（下の角を丸く）
  rect(4, 3, 14, 13, skin);
  rect(5, 13, 13, 14, skin);

  // 頭の上の髪（上の角を丸く）
  rect(4, 1, 14, 3, hair);
  rect(3, 3, 15, 5, hair);

  if (back) {
    if (L.hairStyle === 1 || L.hairStyle === 2) {
      // ボブ・ロング：後ろはまるく下ろす
      rect(3, 5, 15, 13, hair);
      rect(4, 13, 14, 14, dark(hair, 0.9));
      if (L.hairStyle === 2) {
        rect(3, 13, 15, 23, hair);
        rect(4, 20, 14, 23, dark(hair, 0.9));
        rect(4, 23, 14, 24, dark(hair, 0.9));
      }
    } else {
      // 短い髪：えり足に向かってくびれる
      rect(3, 5, 15, 9, hair);
      rect(4, 9, 14, 10, hair);
      rect(5, 10, 13, 11, dark(hair, 0.9));
      rect(6, 11, 12, 12, dark(hair, 0.85));
      rect(3, 8, 4, 10, skin);
      rect(14, 8, 15, 10, skin);
      if (L.hairStyle === 4) {
        // ポニーテール：まん中で結んだ髪
        rect(7, 9, 11, 22, hair);
        rect(7, 9, 11, 11, dark(hair, 0.7));
        rect(8, 20, 10, 23, dark(hair, 0.9));
      }
    }
    rect(5, 2, 8, 3, light(hair));

    drawAccessoriesFrontBack(L, true, rect, thinLine);
    return; // 後ろ向きは目を描かない
  }

  // 前から見た髪
  switch (L.hairStyle) {
    case 0: // ショート：左寄りで分けて両側に流す
      rect(3, 5, 4, 10, hair);
      rect(14, 5, 15, 10, hair);
      rect(4, 5, 7, 7, hair);
      rect(4, 7, 5, 8, hair);
      rect(8, 5, 14, 6, hair);
      rect(10, 6, 14, 7, hair);
      rect(13, 7, 14, 8, hair);
      break;
    case 1: // ボブ
    case 2: {
      // ロング
      rect(4, 5, 14, 7, hair);
      rect(4, 7, 6, 8, hair);
      rect(12, 7, 14, 8, hair);
      rect(8, 7, 10, 8, hair);
      const bottom = L.hairStyle === 1 ? 15 : 24; // ボブはあごの下、ロングは胸まで
      rect(3, 5, 5, bottom, hair);
      rect(13, 5, 15, bottom, hair);
      rect(3, bottom - 2, 5, bottom, dark(hair, 0.88));
      rect(13, bottom - 2, 15, bottom, dark(hair, 0.88));
      break;
    }
    case 3: // センター分け
      rect(3, 5, 4, 10, hair);
      rect(14, 5, 15, 10, hair);
      rect(4, 5, 8, 7, hair);
      rect(10, 5, 14, 7, hair);
      rect(4, 7, 6, 8, hair);
      rect(12, 7, 14, 8, hair);
      break;
    default: // ポニーテール：短い前髪＋頭の横に結んだ髪
      rect(3, 5, 4, 9, hair);
      rect(14, 5, 15, 9, hair);
      rect(4, 5, 14, 6, hair);
      rect(5, 6, 7, 7, hair);
      rect(9, 6, 10, 7, hair);
      rect(12, 6, 14, 7, hair);
      rect(15, 6, 17, 15, hair);
      rect(15, 6, 17, 7, dark(hair, 0.7));
      rect(15, 13, 17, 15, dark(hair, 0.88));
      break;
  }
  rect(5, 2, 8, 3, light(hair));

  // 目：黒目＋左上に白いハイライト
  rect(6, 8, 8, 11, EYE_DARK);
  rect(10, 8, 12, 11, EYE_DARK);
  rect(6, 8, 7, 9, WHITE);
  rect(10, 8, 11, 9, WHITE);
  rect(7, 10, 8, 11, eyes);
  rect(11, 10, 12, 11, eyes);

  drawAccessoriesFrontBack(L, false, rect, thinLine);
}

// 右向き（左向きはこれを反転して使う）
function drawSide(L: Look, frame: number, rect: RectFn, thinLine: RectFn) {
  const { hair, skin, shirt, pants, shoes, eyes } = L;
  rect(3, 46, 15, 47, SHADOW);

  // 体の後ろの髪（ロング・ポニーテール）
  if (L.hairStyle === 2) {
    rect(2, 12, 7, 24, hair);
    rect(2, 21, 6, 24, dark(hair, 0.88));
  }
  if (L.hairStyle === 4) {
    rect(0, 7, 4, 18, hair);
    rect(2, 6, 4, 9, dark(hair, 0.7));
    rect(0, 15, 3, 18, dark(hair, 0.88));
  }

  // 足：歩くときは前後に1ドットずらす
  const st = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const far = 6 - st;
  const near = 8 + st;
  if (L.pantsStyle === 0) {
    rect(far, 29, far + 4, 44, dark(pants));
    rect(near, 29, near + 4, 44, pants);
  } else {
    rect(far + 1, 35, far + 4, 44, dark(skin, 0.9));
    rect(near + 1, 35, near + 4, 44, skin);
    rect(5, 29, 13, 35, pants);
    rect(4, 32, 14, 35, pants);
    rect(4, 34, 14, 35, dark(pants));
  }

  // くつ（つま先は前に1ドット）
  if (frame === 0) {
    rect(6, 42, 11, 45, dark(shoes));
    rect(8, 42, 12, 45, shoes);
    rect(12, 43, 13, 45, shoes);
    rect(6, 45, 13, 46, SOLE);
  } else {
    rect(far, 42, far + 4, 45, dark(shoes));
    rect(near, 42, near + 4, 45, shoes);
    rect(near + 4, 43, near + 5, 45, shoes);
    rect(far, 45, far + 4, 46, SOLE);
    rect(near, 45, near + 5, 46, SOLE);
  }

  // 体
  rect(5, 15, 13, 30, shirt);
  rect(5, 16, 6, 29, dark(shirt));
  if (L.shirtStyle === 2) rect(12, 17, 13, 29, INNER); // ジャケットの前開き
  if (L.shirtStyle === 1) rect(5, 15, 9, 19, dark(shirt)); // パーカーのフード

  // 腕：歩くときは前後・上下に1ドットふる
  const hy = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const hx = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  rect(8, 16, 11, 21, dark(shirt, 0.88));
  if (L.shirtStyle === 0) {
    rect(8 + hx, 21, 11 + hx, 28 + hy, skin);
    rect(10 + hx, 21, 11 + hx, 28 + hy, dark(skin, 0.88));
  } else {
    rect(8 + hx, 21, 11 + hx, 27 + hy, dark(shirt, 0.88));
    rect(8 + hx, 27 + hy, 11 + hx, 29 + hy, skin);
  }

  // 首・頭（下の角を丸く）
  rect(8, 13, 11, 16, skin);
  rect(4, 3, 14, 13, skin);
  rect(5, 13, 13, 14, skin);
  rect(14, 9, 15, 10, skin); // 鼻

  // 髪：頭の上・後頭部・おでこ
  rect(4, 1, 14, 3, hair);
  rect(3, 3, 15, 5, hair);
  rect(3, 5, 8, 11, hair);
  rect(4, 11, 8, 12, hair);
  rect(3, 5, 14, 7, hair);

  switch (L.hairStyle) {
    case 0: // ショート：前に向かって下がる前髪
      rect(9, 7, 14, 8, hair);
      rect(12, 8, 14, 9, hair);
      break;
    case 1: // ボブ
    case 2: // ロング
      rect(10, 7, 14, 8, hair);
      rect(2, 7, 8, L.hairStyle === 1 ? 15 : 16, hair);
      rect(2, 13, 8, 15, dark(hair, 0.88));
      break;
    case 3: // センター分け
      rect(9, 7, 12, 8, hair);
      rect(13, 7, 14, 9, hair);
      break;
    default: // ポニーテール
      rect(10, 7, 14, 8, hair);
      break;
  }
  rect(5, 2, 8, 3, light(hair));

  // 目は1つ
  rect(11, 8, 13, 11, EYE_DARK);
  rect(11, 8, 12, 9, WHITE);
  rect(12, 10, 13, 11, eyes);
  drawAccessoriesSide(L, rect, thinLine);
}

// 正面・後ろ向きのアクセサリー
function drawAccessoriesFrontBack(L: Look, back: boolean, rect: RectFn, thinLine: RectFn) {
  if (!back) {
    // ネックレス
    if (L.necklaceStyle > 0) {
      const c = L.necklaceColor;
      rect(6, 16, 7, 18, c);
      rect(11, 16, 12, 18, c);
      rect(7, 18, 11, 19, c);
      if (L.necklaceStyle === 1) {
        rect(8, 19, 10, 22, c);
        rect(8, 20, 9, 21, light(c));
      }
    }

    // 眼鏡・サングラス
    if (L.glassesStyle > 0) {
      const c = L.glassesColor;
      // サングラスの薄いレンズ
      if (L.glassesStyle === 2) {
        rect(5, 8, 8, 11, LENS);
        rect(10, 8, 13, 11, LENS);
      }
      // 左側のフレーム
      thinLine(5, 7.5, 8.5, 7.5, c);
      thinLine(5, 11.5, 8.5, 11.5, c);
      thinLine(4.7, 8, 4.7, 11, c);
      thinLine(8.5, 8, 8.5, 11, c);
      // 右側のフレーム
      thinLine(9.5, 7.5, 13, 7.5, c);
      thinLine(9.5, 11.5, 13, 11.5, c);
      thinLine(9.5, 8, 9.5, 11, c);
      thinLine(13.3, 8, 13.3, 11, c);
      // 中央のブリッジ
      thinLine(8.5, 8.5, 9.5, 8.5, c);
    }

    // ピアス（耳の位置）
    const e = L.earringsColor;
    if (L.earringsStyle === 1) {
      // スタッドピアス
      rect(3, 9, 4, 10, e);
      rect(14, 9, 15, 10, e);
    } else if (L.earringsStyle === 2) {
      // 左耳：小さなリング
      rect(2, 9, 4, 10, e);
      rect(2, 10, 3, 12, e);
      rect(3, 11, 4, 12, e);
      // 右耳：小さなリング
      rect(14, 9, 16, 10, e);
      rect(15, 10, 16, 12, e);
      rect(14, 11, 15, 12, e);
    }
  }

  // リボン
  if (L.ribbonStyle > 0) {
    const c = L.ribbonColor;
    const mid = L.ribbonStyle === 1 ? 3 : L.ribbonStyle === 2 ? 14 : 9;
    rect(mid - 2, 3, mid, 6, c);
    rect(mid, 4, mid + 1, 5, dark(c));
    rect(mid + 1, 3, mid + 3, 6, c);
    rect(mid - 1, 6, mid + 2, 7, dark(c));
  }

  // キャップ
  if (L.capStyle > 0) {
    const c = L.capColor;
    rect(3, 0, 15, 4, c);
    rect(4, 0, 14, 1, light(c));
    rect(3, 3, 15, 5, dark(c));
    if ((L.capStyle === 1 && !back) || (L.capStyle === 2 && back)) {
      rect(5, 5, 14, 6, dark(c));
    }
    if (L.capStyle === 2 && !back) {
      rect(8, 1, 10, 3, light(c));
    }
  }
}

// 横向きのアクセサリー
function drawAccessoriesSide(L: Look, rect: RectFn, thinLine: RectFn) {
  if (L.necklaceStyle > 0) {
    rect(11, 16, 12, 19, L.necklaceColor);
    if (L.necklaceStyle === 1) rect(11, 19, 13, 21, L.necklaceColor);
  }

  // 横向きの眼鏡・サングラス
  if (L.glassesStyle > 0) {
    const c = L.glassesColor;
    if (L.glassesStyle === 2) rect(11, 8, 14, 11, LENS);
    // 細いレンズフレーム
    thinLine(11, 7.5, 14, 7.5, c);
    thinLine(11, 11.5, 14, 11.5, c);
    thinLine(10.7, 8, 10.7, 11, c);
    thinLine(14.3, 8, 14.3, 11, c);
    // 耳にかかる部分
    thinLine(7, 8.5, 11, 8.5, c);
  }

  // 横向きのピアス（耳の位置）
  const e = L.earringsColor;
  if (L.earringsStyle === 1) {
    rect(6, 9, 7, 10, e); // スタッド
  } else if (L.earringsStyle === 2) {
    // 小さなリング
    rect(5, 9, 7, 10, e);
    rect(5, 10, 6, 12, e);
    rect(6, 11, 7, 12, e);
  }

  if (L.ribbonStyle > 0) {
    rect(2, 3, 5, 5, L.ribbonColor);
    rect(3, 5, 4, 7, dark(L.ribbonColor));
  }

  if (L.capStyle > 0) {
    const c = L.capColor;
    rect(3, 0, 15, 4, c);
    rect(3, 3, 15, 5, dark(c));
    if (L.capStyle === 1) rect(13, 5, 17, 6, dark(c));
    else rect(1, 4, 6, 5, dark(c));
  }
}
