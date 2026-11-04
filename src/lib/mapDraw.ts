import {
  ClipOp,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';

import {
  BOSS_FLOOR,
  BOSS_ROOM_FLOOR_COLOR,
  BOSS_ROOM_RIGHT,
  FLOORS,
  FLOOR_COLORS,
  FLOOR_IMAGES,
  LOST_ITEMS,
  OBJECTS,
  TEACHER_IMAGES,
  WALL_COLORS,
  WALL_HEIGHT,
  WALL_TOP_COLOR,
  type Obj,
} from '@/data/map';
import type { GameData } from '@/state/game';
import type { Look } from '@/state/character';

import { dotFont, skImage } from './assets';
import { SPRITE_H, SPRITE_W, drawHero } from './sprite';

/**
 * マップをかく係（Java版の MapView の onDraw）。何をかくかは MapData と GameState を見て決める。
 *   drawMap(canvas, 幅, 高さ, ゲームの状態, 主人公の見た目, 歩きのコマ)
 */
const VISIBLE_ROWS = 10; // 画面の縦に見えるマスの数
const HERO_TILES = 1.6; // 主人公の高さ（マス）。先生（2マス）の8割

let fill: SkPaint | null = null;
let line: SkPaint | null = null;
let textPaint: SkPaint | null = null;

function paints() {
  if (!fill) {
    fill = Skia.Paint();
    fill.setAntiAlias(false);
    line = Skia.Paint();
    line.setStyle(PaintStyle.Stroke);
    line.setStrokeWidth(1);
    line.setColor(Skia.Color('rgba(0,0,0,0.13)'));
    textPaint = Skia.Paint();
    textPaint.setAntiAlias(true);
    textPaint.setColor(Skia.Color('#FFFFFF'));
  }
  return { fill: fill!, line: line!, text: textPaint! };
}

const R = (l: number, t: number, r: number, b: number) => Skia.XYWHRect(l, t, r - l, b - t);

/** 色をまぜる（rate = 0 なら a のまま、1 なら b） */
function mix(a: string, b: string, rate: number): string {
  const p = (h: string) => {
    const n = parseInt(h.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.trunc(x * (1 - rate) + y * rate);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

/** 画像をかく（smooth：なめらかに縮める。false ならドットをぼかさない） */
function image(c: SkCanvas, img: SkImage, l: number, t: number, r: number, b: number, smooth: boolean) {
  const src = Skia.XYWHRect(0, 0, img.width(), img.height());
  if (smooth) c.drawImageRectOptions(img, src, R(l, t, r, b), FilterMode.Linear, MipmapMode.Linear);
  else c.drawImageRectOptions(img, src, R(l, t, r, b), FilterMode.Nearest, MipmapMode.None);
}

/** x0〜x1 の列の中で、y 行目が空白だけか */
function emptyRow(map: readonly string[], y: number, x0: number, x1: number) {
  for (let x = x0; x <= x1 && x < map[y].length; x++) if (map[y][x] !== ' ') return false;
  return true;
}

/** 空白だけの列か */
function emptyColumn(map: readonly string[], x: number) {
  for (const row of map) if (x < row.length && row[x] !== ' ') return false;
  return true;
}

const at = (map: readonly string[], x: number, y: number) =>
  y < 0 || y >= map.length || x < 0 || x >= map[y].length ? null : map[y][x];

/** 壁か、壁にうめこまれたもの（階段・扉・受付）か */
function isWallLike(map: readonly string[], x: number, y: number) {
  const c = at(map, x, y);
  return c === '#' || c === '%' || c === '/' || c === '!' || c === 'L';
}

/** 部屋の中のマスか（床や置き物。壁・何もない所・壁にうめこまれた階段や扉や受付はちがう） */
function isInside(map: readonly string[], x: number, y: number) {
  const c = at(map, x, y);
  return c === '.' || c === 'P' || c === 'T' || c === 'R' || c === 'K' || c === '$';
}

/**
 * 画面のどこからマップを描き始めるか（横・縦それぞれで使う）
 *   マップが画面に入りきる → まん中に置く
 *   入りきらない           → 主人公の位置に合わせて動かす
 */
function camera(screen: number, mapSize: number, pos: number, minPos: number, maxPos: number) {
  if (mapSize <= screen) return (screen - mapSize) / 2;
  let rate = maxPos > minPos ? (pos - minPos) / (maxPos - minPos) : 0.5;
  rate = Math.max(0, Math.min(1, rate));
  return -rate * (mapSize - screen);
}

/** 主人公が立てるマスの範囲 [一番左, 一番右, 一番上, 一番下]（x0〜x1 の列の中だけで調べる） */
function walkRange(map: readonly string[], x0: number, x1: number) {
  let minX = Infinity;
  let maxX = -1;
  let minY = Infinity;
  let maxY = -1;
  for (let y = 0; y < map.length; y++) {
    for (let x = x0; x <= x1 && x < map[y].length; x++) {
      const c = map[y][x];
      if (c === '.' || c === 'P' || c === 'T' || c === 'R') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return [minX, maxX, minY, maxY];
}

/** 置き物の絵がかぶさるマスを調べる */
function coveredTiles(f: number, rows: number, cols: number) {
  const covered = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  for (const o of OBJECTS[f]) {
    const img = skImage(o.image);
    if (!img) continue;
    const h = (o.width * img.height()) / img.width(); // 絵の高さ（マス）
    const x0 = Math.floor(o.left);
    const x1 = Math.ceil(o.left + o.width) - 1;
    const y0 = Math.floor(o.bottom + 1 - (o.lift ?? 0) - h);
    for (let y = Math.max(0, y0); y <= Math.min(rows - 1, o.bottom); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(cols - 1, x1); x++) covered[y][x] = true;
    }
  }
  return covered;
}

export type MapState = Pick<GameData, 'floor' | 'px' | 'py' | 'dir' | 'foundLost'>;

/** マップ全体をかく */
export function drawMap(c: SkCanvas, width: number, height: number, g: MapState, look: Look, walkFrame: number) {
  const { fill, line, text } = paints();
  const f = g.floor;
  const map = FLOORS[f];
  const rows = map.length;
  const cols = map[0].length;

  // 見える列の範囲：理事長室がある階は、部屋の「中」と「外」を分けて、主人公がいる方だけ描く
  let vx0 = 0;
  let vx1 = cols - 1;
  let vy0 = 0;
  let vy1 = rows - 1;
  if (f === BOSS_FLOOR) {
    if (g.px <= BOSS_ROOM_RIGHT) vx1 = BOSS_ROOM_RIGHT;
    else vx0 = BOSS_ROOM_RIGHT + 1;
    // 何もない列（空白だけ）は、はしからけずる
    while (vx0 < vx1 && emptyColumn(map, vx0)) vx0++;
    while (vx1 > vx0 && emptyColumn(map, vx1)) vx1--;
    // 見える列の中で何もない行も、上と下からけずる（理事長室が画面のまん中に来るように）
    while (vy0 < vy1 && emptyRow(map, vy0, vx0, vx1)) vy0++;
    while (vy1 > vy0 && emptyRow(map, vy1, vx0, vx1)) vy1--;
    vy0 = Math.max(0, vy0 - (WALL_HEIGHT[f] - 1)); // 奥の壁は上にはみ出して描くので、そのぶん上も見せる
  }
  const vcols = vx1 - vx0 + 1;
  const vrows = vy1 - vy0 + 1;

  // 1マスの大きさ：縦に VISIBLE_ROWS マス見える大きさ（横が入りきらないときは横に合わせる）
  const tile = Math.min(width / vcols, height / VISIBLE_ROWS);
  // 画面のどこからマップを描くか（大きいマップは主人公を追いかける）
  const r = walkRange(map, vx0, vx1);
  const left = camera(width, tile * vcols, g.px - vx0, r[0] - vx0, r[1] - vx0) - vx0 * tile;
  const top = camera(height, tile * vrows, g.py - vy0, r[2] - vy0, r[3] - vy0) - vy0 * tile;
  const font = dotFont(Math.max(1, Math.round(tile * 0.45)));

  const rect = (color: string, l: number, t: number, s: number) => {
    fill.setColor(Skia.Color(color));
    c.drawRect(Skia.XYWHRect(l, t, s, s), fill);
  };

  // 見える範囲の外は描かない（理事長室の中から廊下、廊下から理事長室が見えないように）
  c.save();
  c.clipRect(R(left + vx0 * tile, 0, left + (vx1 + 1) * tile, height), ClipOp.Intersect, false);

  // 置き物の絵の下にかくれるマス（記号の絵は描かず、床だけにする）
  const covered = coveredTiles(f, rows, cols);
  const floorImg = FLOOR_IMAGES[f] ? skImage(FLOOR_IMAGES[f]!) : null;

  // ① マスを全部描く
  let tx = -1;
  let ty = -1; // 先生の位置
  let rx = -1;
  let ry = -1; // 理事長の位置
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = map[y][x];
      const l = left + x * tile;
      const t = top + y * tile;
      if (ch === 'T') {
        tx = x;
        ty = y;
      }
      if (ch === 'R') {
        rx = x;
        ry = y;
      }
      if (ch === ' ' || ch === '#') continue; // 何もない場所は描かない。壁はあとで描く
      // 壁以外は、まず床を描く
      if (f === BOSS_FLOOR && x <= BOSS_ROOM_RIGHT) {
        rect(BOSS_ROOM_FLOOR_COLOR, l, t, tile); // 理事長室：暗い色のじゅうたん
        fill.setColor(Skia.Color('rgba(255,255,255,0.08)'));
        c.drawRect(R(l, t, l + tile, t + tile * 0.04), fill); // うっすら目地
        c.drawRect(R(l, t, l + tile * 0.04, t + tile), fill);
      } else if (floorImg) {
        image(c, floorImg, l, t, l + tile, t + tile, false); // 床の画像（ドットをぼかさない）
      } else {
        rect(FLOOR_COLORS[f], l, t, tile); // 画像がない階は色でぬる
        c.drawRect(Skia.XYWHRect(l, t, tile, tile), line);
      }
      if (covered[y][x]) continue;
      switch (ch) {
        case '/':
          drawStairs(l, t, tile);
          break;
        case '!':
        case 'L': // 理事長室の扉（見た目はふつうの扉）
          drawDoor(l, t, tile);
          break;
        case '%':
          box('#8B5A2B', l, t, tile, '武');
          break;
        case '$':
          box('#2E7D32', l, t, tile, '道');
          break;
      }
    }
  }

  // ② 壁の影を床に落とす（壁の下と、左の壁の右がわ）
  fill.setColor(Skia.Color('rgba(0,0,0,0.275)'));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isInside(map, x, y)) continue;
      const l = left + x * tile;
      const t = top + y * tile;
      if (isWallLike(map, x, y - 1)) c.drawRect(R(l, t, l + tile, t + tile * 0.3), fill);
      if (isWallLike(map, x - 1, y)) c.drawRect(R(l, t, l + tile * 0.18, t + tile), fill);
    }
  }

  // ③ 壁を描く（奥の壁は上のマスにはみ出すので、床を全部描いたあとに描く）
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = map[y][x];
      if (ch === '#' || ch === '%') drawWall(x, y, left + x * tile, top + y * tile, tile); // 受付（%）も壁の一部
    }
  }

  // ③.5 落とし物（まだ拾っていない物だけ）
  LOST_ITEMS.forEach((l, i) => {
    if (l.floor !== f || g.foundLost[i]) return;
    const img = skImage(l.image);
    const cx = left + l.x * tile + tile / 2;
    const cy = top + l.y * tile + tile / 2;
    fill.setColor(Skia.Color('rgba(0,0,0,0.2)')); // 小さなかげ
    c.drawOval(R(cx - tile * 0.28, cy + tile * 0.12, cx + tile * 0.28, cy + tile * 0.26), fill);
    const half = tile * 0.3;
    if (img) image(c, img, cx - half, cy - half, cx + half, cy + half, false);
  });

  // ④ 置き物・先生・主人公を、上の行から順に描く（下の行にあるものほど手前に見える）
  const teacherImg = TEACHER_IMAGES[f] ? skImage(TEACHER_IMAGES[f]!) : null;
  const bossImg = skImage('boss_rijicho');
  const showTeacher = tx >= 0 && !!teacherImg; // 勝ったあとも、先生はその場に残る
  for (let y = 0; y < rows; y++) {
    for (const o of OBJECTS[f]) if (o.bottom === y) drawObject(o);
    if (showTeacher && ty === y) drawTeacher(teacherImg!, tx, ty);
    if (rx >= 0 && ry === y && bossImg) drawTeacher(bossImg, rx, ry); // 理事長
    if (g.py === y) drawPlayer(left + g.px * tile, top + g.py * tile);
  }
  c.restore();

  // ---- 小さな道具 ----

  function drawObject(o: Obj) {
    const img = skImage(o.image);
    if (!img) return;
    const w = o.width * tile;
    const h = (w * img.height()) / img.width();
    const l = left + o.left * tile;
    const bottom = top + (o.bottom + 1 - (o.lift ?? 0)) * tile;
    image(c, img, l, bottom - h, l + w, bottom, true);
  }

  /** 先生：2マス分の高さで、足もとをマスに合わせて描く（上のマスにはみ出す） */
  function drawTeacher(img: SkImage, x: number, y: number) {
    const h = tile * 2;
    const w = (img.width() * h) / img.height();
    const cx = left + x * tile + tile / 2;
    const bottom = top + (y + 1) * tile;
    image(c, img, cx - w / 2, bottom - h, cx + w / 2, bottom, false);
  }

  /** 主人公：足元をマスの下側に合わせる（上のマスにはみ出す） */
  function drawPlayer(l: number, t: number) {
    const scale = (tile * HERO_TILES) / SPRITE_H;
    const drawX = l + (tile - SPRITE_W * scale) / 2;
    const drawY = t + tile - SPRITE_H * scale;
    drawHero(c, look, drawX, drawY, scale, g.dir, walkFrame);
  }

  /**
   * 壁を1マス描く。まわりのマスを見て、3種類に描き分ける
   *   奥の壁（すぐ下が部屋の中）   → WALL_HEIGHT マス分の高さの白い面。てっぺんに濃い上面、下に幅木
   *   手前の壁（すぐ上が部屋の中） → 濃い上面の細い帯だけ（部屋の中が見えるように）
   *   左右の壁（それ以外）         → 濃い上面。部屋がわのふちを少し明るく
   */
  function drawWall(x: number, y: number, l: number, t: number, s: number) {
    const face = WALL_COLORS[f];
    const topColor = WALL_TOP_COLOR;
    if (isInside(map, x, y + 1)) {
      const t0 = t - s * (WALL_HEIGHT[f] - 1);
      fill.setColor(Skia.Color(face));
      c.drawRect(R(l, t0, l + s, t + s), fill);
      line.setColor(Skia.Color(mix(face, '#000000', 0.08)));
      for (let yy = t0 + s * 0.7; yy < t + s * 0.8; yy += s * 0.4) c.drawLine(l, yy, l + s, yy, line);
      fill.setColor(Skia.Color(topColor));
      c.drawRect(R(l, t0, l + s, t0 + s * 0.3), fill);
      fill.setColor(Skia.Color(mix(face, '#000000', 0.4)));
      c.drawRect(R(l, t + s * 0.8, l + s, t + s), fill);
    } else if (isInside(map, x, y - 1)) {
      fill.setColor(Skia.Color(topColor));
      c.drawRect(R(l, t, l + s, t + s * 0.3), fill);
    } else {
      fill.setColor(Skia.Color(topColor));
      c.drawRect(R(l, t, l + s, t + s), fill);
      fill.setColor(Skia.Color(mix(topColor, '#FFFFFF', 0.25)));
      if (isInside(map, x + 1, y)) c.drawRect(R(l + s * 0.94, t, l + s, t + s), fill);
      if (isInside(map, x - 1, y)) c.drawRect(R(l, t, l + s * 0.06, t + s), fill);
    }
    line.setColor(Skia.Color('rgba(0,0,0,0.13)'));
  }

  /** 階段：灰色の段を3本 */
  function drawStairs(l: number, t: number, s: number) {
    fill.setColor(Skia.Color('#616161'));
    c.drawRect(R(l, t, l + s, t + s), fill);
    fill.setColor(Skia.Color('#BDBDBD'));
    for (let i = 0; i < 3; i++) {
      const yy = t + s * (0.12 + i * 0.3);
      c.drawRect(R(l + s * 0.1, yy, l + s * 0.9, yy + s * 0.18), fill);
    }
  }

  /** 扉：木の色に、取っ手 */
  function drawDoor(l: number, t: number, s: number) {
    fill.setColor(Skia.Color('#A1662F'));
    c.drawRect(R(l + s * 0.05, t + s * 0.05, l + s * 0.95, t + s * 0.95), fill);
    fill.setColor(Skia.Color('#FFD54F'));
    fill.setAntiAlias(true);
    c.drawCircle(l + s * 0.75, t + s * 0.5, s * 0.07, fill);
    fill.setAntiAlias(false);
  }

  function box(color: string, l: number, t: number, s: number, label: string) {
    const m = s * 0.1;
    fill.setColor(Skia.Color(color));
    c.drawRect(R(l + m, t + m, l + s - m, t + s - m), fill);
    const w = font.measureText(label).width;
    c.drawText(label, l + s / 2 - w / 2, t + s / 2 + font.getSize() * 0.35, text, font);
  }
}
