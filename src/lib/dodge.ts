import {
  ClipOp,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  StrokeCap,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';

import { DODGE_MAX_ASPECT, DODGE_NARROW, DODGE_PC_INTERVAL_MS } from '@/data/battle';

import { dotFont, skImage } from './assets';
import { se } from './sound';

/**
 * 5Fのよけゲームの四角（Java版の DodgeView）。
 * 指でなぞるとハートが動く（指の動いた分だけ動くので、ハートに指がかぶらない）。
 * 先生のこうげきが飛んでくるので、当たらないようによける。
 *   ・理事長：チョーク・ペン・マウス・パソコンのパターン
 *   ・校長　：ハンコ・チャイム・時計の針・書類のパターン
 * 動かす：frame()（毎コマ呼ぶ）、かく：draw(canvas)
 * 当たった・よけきった・ドスン！は events にたまるので、戦闘画面が取り出して使う
 */

// こうげきの種類
const CHALK = 0; // チョーク：左右から横に飛んでくる
const PEN = 1; // ペン：上から落ちてくる
const MOUSE = 2; // マウス：かべで跳ね返りながら動き回る
const PC = 3; // パソコン：ハートをねらって上から落ちる（赤い予告あり）
const STAMP = 4; // 校長のハンコ：赤い丸の予告のあと、ドンと押される
const BELL = 5; // チャイムの鐘：まん中に置かれる（さわると痛い）
const RING = 6; // チャイムの輪：鐘から広がる。向かい合わせに2か所すき間がある
const HAND = 7; // 時計の針：まん中を軸に回る
const WAVE = 8; // マイクの音波：上下にゆれながら横に流れる、通り道の外がわ
const PAPER = 9; // 書類：上から落ちてきて、下に積もる（積もった書類もかべになる）

/** 理事長戦の攻撃パターン（ランダムではなく、決まった形で飛んでくる） */
export const P_CHALK_WALL = 0; // チョークの壁：1か所だけすき間がある列が、左右から交互に来る
export const P_PEN_SNIPE = 1; // ペンの狙い撃ち：ハートに向きを合わせ、少し止まってから一直線に飛んでくる
export const P_MOUSE_HOMING = 2; // マウスの追いかけ：ハートをねらって曲がりながら追いかけてくる
export const P_PC_ROW = 3; // パソコンの列：わくのはしからはしまで降る。1列だけ逃げ道がある
export const PATTERN_COUNT = 4; // 理事長のパターンの数（0〜3）
/** 校長戦の攻撃パターン */
export const P_STAMP = 4; // ハンコ連打
export const P_CHIME = 5; // チャイムの輪
export const P_CLOCK = 6; // 時計の針
export const P_MIC = 7; // マイクの音波（今は使っていない）
export const P_CLOCK_STAMP = 8; // 時計の針＋ハンコ
export const P_PAPERS = 9; // 書類の山
export const P_CHIME_SPIN = 10; // チャイムの輪（第2形態）：すき間がゆっくり回る

export type DodgeEvent = { type: 'hit' } | { type: 'end'; noHit: boolean } | { type: 'impact' };

type Shot = {
  type: number;
  x: number; // まん中の位置
  y: number;
  vx: number; // 1秒に進む量
  vy: number;
  w: number; // 大きさ（w が長い方）
  h: number;
  angle: number; // 向き（度）
  bounceLeft: number; // マウス：跳ね返る残り時間（秒）
  dropAt: number; // パソコン：落ち始める時刻（それまでは予告だけ）
  landed: boolean; // パソコン：底に落ちたか
  born: number; // 出てきた時刻
  homingLeft: number; // マウス：ハートを追いかける残り時間（秒）
  snipe: boolean; // ペンの狙い撃ち
  lockAt: number; // 狙い撃ち：この時刻から、向きを固定する
  dashAt: number; // 狙い撃ち：この時刻に、一直線に飛び出す
  dashSpeed: number; // 狙い撃ち：飛び出す速さ
  spin: number; // 時計の針：1秒に回る角度（度）
  flipAt: number; // 時計の針：この時刻に逆回りになる
  flipEvery: number; // 時計の針：逆回りになる間かく
  face: boolean; // 時計の針：文字ばんもいっしょに描く
  gapDir: number; // チャイムの輪：すき間の向き（度）
  col: number; // 書類：落ちる列
};

type Rect = { left: number; top: number; right: number; bottom: number };
const width = (r: Rect) => r.right - r.left;
const height = (r: Rect) => r.bottom - r.top;
const cx = (r: Rect) => (r.left + r.right) / 2;
const cy = (r: Rect) => (r.top + r.bottom) / 2;

const DP = 2; // Java版の 1dp（基準の単位で 2）
const HIT_GUARD_MS = 1000; // 当たったあと、無敵になる時間
const SPAWN_STOP_MS = 700; // こうげきの終わり近くは、新しい物を出さない
const SHRINK_MS = 800;
const MOUSE_TURN = 2.6; // マウスが1秒に曲がれる角度（ラジアン）
// ---- 校長戦の数字 ----
const STAMP_WARN_MS = 850; // ハンコ：予告してから押されるまで
const STAMP_HIT_MS = 250; // ハンコ：押されてから当たる時間
const STAMP_SIZE = 0.2; // ハンコ：半径（わくの高さの何倍か）
const STAMP_BIG_RATE = 2.5; // ハンコ：ハートと関係ない場所に出る、大きいハンコの倍率
const STAMP_MARK_MS = 700; // ハンコ：押したあと、あとが残る時間（当たらない）
const STAMP_EVERY_MS = 550; // ハンコ：次の予告まで
const BELL_WARN_MS = 900; // チャイム：鐘が出てから、さわると痛くなるまで
const RING_EVERY_MS = 1300; // チャイム：次の輪まで
const RING_GAP_DEG = 45; // チャイム：輪のすき間1つの大きさ（度）
const RING_GAP_SPIN = 45; // チャイム（第2形態）：すき間が1秒に回る角度（度）
const HAND_WARN_MS = 800; // 時計：針が出てから、当たるようになるまで
const HAND_SPIN = 150; // 時計：長い針が1秒に回る角度（度）
const HAND_FLIP_MS = 2600; // 時計：長い針が逆回りになる間かく
const FLIP_WARN_MS = 600; // 時計：逆回りの前に、針が点めつする時間
const COMBO_HAND_RATE = 0.6; // 針＋ハンコ：針の速さ（時計だけのときの何倍か）
const COMBO_STAMP_WARN_MS = 1000; // 針＋ハンコ：ハンコの予告の長さ
const COMBO_STAMP_EVERY_MS = 1100; // 針＋ハンコ：次のハンコまで
const WAVE_OPEN_MS = 1200; // 音波：通り道が、だんだんせまくなる時間
const PAPER_WARN_MS = 450; // 書類：列が光ってから、落ち始めるまで
const PAPER_EVERY_MS = 400; // 書類：次の書類まで
const PAPER_FALL = 1.1; // 書類：落ちる速さ（1秒に、わくの高さの何倍か）
const PAPER_THICK = 0.09; // 書類：1枚（1束）の厚さ（わくの高さの何倍か）
const PAPER_MAX = 0.6; // 書類：積もる高さの上限（わくの高さの何倍か）
const PAPER_AIM = 0.45; // 書類：ハートのいる列をねらう割合

const NEVER = Number.MAX_SAFE_INTEGER;
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const rnd = () => Math.random();
const randInt = (n: number) => Math.floor(Math.random() * n);
const deg = (rad: number) => (rad * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
/** Java の (now / n) % 2 == 0（点めつ用） */
const blinkOn = (now: number, n: number) => Math.floor(now / n) % 2 === 0;
/** 0xAARRGGBB → Skia の色 */
const C = (argb: number) => {
  const a = ((argb >>> 24) & 255) / 255;
  return Skia.Color(`rgba(${(argb >> 16) & 255},${(argb >> 8) & 255},${argb & 255},${a})`);
};

function newShot(type: number, now: number): Shot {
  return {
    type,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    w: 0,
    h: 0,
    angle: 0,
    bounceLeft: 0,
    dropAt: 0,
    landed: false,
    born: now,
    homingLeft: 0,
    snipe: false,
    lockAt: 0,
    dashAt: 0,
    dashSpeed: 0,
    spin: 0,
    flipAt: 0,
    flipEvery: 0,
    face: false,
    gapDir: 0,
    col: 0,
  };
}

export class DodgeEngine {
  events: DodgeEvent[] = [];

  private arena: Rect = { left: 0, top: 0, right: 0, bottom: 0 }; // 今の四角（せまくなることがある）
  private base: Rect = { left: 0, top: 0, right: 0, bottom: 0 }; // 元の大きさの四角
  private sized = false;
  private shots: Shot[] = [];
  // ---- ハート ----
  private heartX = 0;
  private heartY = 0;
  private heartSize = 0;
  private guardUntil = 0;
  // ---- こうげき ----
  private running = false;
  private patterns: number[] = [];
  private speed = 1;
  private density = 1;
  private waveStart = 0;
  private waveLength = 0;
  private lastFrame = 0;
  private nextSpawn: number[] = [];
  private hitThisWave = false;
  private pcInterval = DODGE_PC_INTERVAL_MS;
  // ---- 四角をせまくする演出 ----
  private arenaScale = 1;
  private scaleFrom = 1;
  private scaleTo = 1;
  private shrinkStart = -1;
  private bossFrame = false; // true なら、わくを赤くする（理事長戦）
  // ---- 攻撃パターン ----
  private pattern = -1;
  private patternNext = 0;
  private patternStep = 0;
  private gapY = 0;
  private paperTop: number[] = [];
  private paperCols = 0;
  // ---- 一時停止 ----
  private paused = false;
  private pausedAt = 0;

  // ---- 絵をかく道具 ----
  private pixel: SkPaint;
  private frameP: SkPaint;
  private fill: SkPaint;
  private aim: SkPaint;
  private line: SkPaint;
  private soft: SkPaint;
  private text: SkPaint;
  private img: { heart: SkImage | null; chalk: SkImage | null; pen: SkImage | null; mouse: SkImage | null; pc: SkImage | null };

  constructor() {
    this.pixel = Skia.Paint();
    this.frameP = Skia.Paint();
    this.frameP.setAntiAlias(true);
    this.frameP.setStyle(PaintStyle.Stroke);
    this.frameP.setStrokeWidth(3 * DP);
    this.fill = Skia.Paint();
    this.aim = Skia.Paint();
    this.aim.setAntiAlias(true);
    this.aim.setStyle(PaintStyle.Stroke);
    this.aim.setStrokeWidth(2 * DP);
    this.line = Skia.Paint();
    this.line.setAntiAlias(true);
    this.line.setStyle(PaintStyle.Stroke);
    this.line.setStrokeCap(StrokeCap.Round);
    this.soft = Skia.Paint();
    this.soft.setAntiAlias(true);
    this.text = Skia.Paint();
    this.text.setAntiAlias(true);
    this.img = {
      heart: skImage('dodge_heart'),
      chalk: skImage('dodge_chalk'),
      pen: skImage('dodge_pen'),
      mouse: skImage('dodge_mouse'),
      pc: skImage('dodge_pc'),
    };
  }

  /** 画像のたて ÷ よこ */
  private ratio(i: SkImage | null) {
    return i ? i.height() / i.width() : 1;
  }

  /** わくを赤くする（理事長戦） */
  setBossFrame(on: boolean) {
    this.bossFrame = on;
  }

  /** パソコンが降ってくる間かくを変える */
  setPcInterval(ms: number) {
    this.pcInterval = ms;
  }

  /** 四角を、元の大きさの rate 倍にせまくする（ギュッと縮む演出つき） */
  shrinkArena(rate: number) {
    this.scaleFrom = this.arenaScale;
    this.scaleTo = rate;
    this.shrinkStart = clock();
  }

  /** arenaScale に合わせて、今の四角の大きさを決める（まん中はそのまま） */
  private applyArena() {
    const w = width(this.base) * this.arenaScale;
    const h = height(this.base) * this.arenaScale;
    this.arena = { left: cx(this.base) - w / 2, top: cy(this.base) - h / 2, right: cx(this.base) + w / 2, bottom: cy(this.base) + h / 2 };
    const half = this.heartSize / 2;
    this.heartX = Math.max(this.arena.left + half, Math.min(this.arena.right - half, this.heartX));
    this.heartY = Math.max(this.arena.top + half, Math.min(this.arena.bottom - half, this.heartY));
  }

  /** 大きさが決まったとき（変わったとき） */
  setSize(w: number, h: number) {
    const m = 4 * DP;
    // 横長になりすぎないように、横幅をせまくして、まん中に置く
    const bh = h - m * 2;
    const full = w - m * 2;
    const narrow = Math.min(full, bh * DODGE_MAX_ASPECT);
    const bw = full - (full - narrow) * DODGE_NARROW;
    const left = (w - bw) / 2;
    this.base = { left, top: m, right: left + bw, bottom: m + bh };
    this.heartSize = height(this.base) * 0.09;
    const first = !this.sized;
    this.sized = true;
    this.applyArena();
    if (first) {
      // はじめはまん中
      this.heartX = cx(this.arena);
      this.heartY = cy(this.arena);
    }
  }

  /** 理事長戦：決まった攻撃パターンで、こうげき開始 */
  startPatternWave(p: number, speedRate: number, lengthMs: number) {
    const now = clock();
    this.shots = [];
    this.patterns = [];
    this.pattern = p;
    this.speed = speedRate;
    this.waveStart = now;
    this.lastFrame = now;
    this.waveLength = lengthMs;
    this.patternNext = now + 600;
    this.patternStep = 0;
    this.gapY = cy(this.arena);
    this.hitThisWave = false;
    this.running = true;
  }

  /** ランダムなこうげき開始（kinds の種類がまざって出てくる） */
  startWave(kinds: number[], speedRate: number, densityRate: number, lengthMs: number) {
    const now = clock();
    this.pattern = -1;
    this.shots = [];
    this.patterns = kinds;
    this.speed = speedRate;
    this.density = densityRate;
    this.waveStart = now;
    this.lastFrame = now;
    this.waveLength = lengthMs;
    this.nextSpawn = kinds.map(() => now + 500);
    this.hitThisWave = false;
    this.running = true;
  }

  /** 一時停止：動きを止める（絵はそのまま表示しておく） */
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.pausedAt = clock();
  }

  /** 再開：止めていた時間の分だけ、全部の時刻を後ろにずらして、続きから動かす */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    const d = clock() - this.pausedAt;
    this.waveStart += d;
    this.lastFrame += d;
    this.patternNext += d;
    this.nextSpawn = this.nextSpawn.map((t) => t + d);
    this.guardUntil += d;
    if (this.shrinkStart >= 0) this.shrinkStart += d;
    for (const s of this.shots) {
      s.born += d;
      s.dropAt += d;
      s.lockAt += d;
      s.dashAt += d;
      if (s.flipAt !== NEVER) s.flipAt += d;
    }
  }

  /** こうげきを止める（勝ち負けが決まったときなど） */
  stop() {
    this.running = false;
    this.shots = [];
  }

  /** ハートを (dx, dy) だけ動かす（画面のどこをなぞっても動かせるように、戦闘画面から呼ぶ） */
  dragBy(dx: number, dy: number) {
    if (this.paused) return; // 止めている間は、ハートを動かさない
    const half = this.heartSize / 2;
    this.heartX = Math.max(this.arena.left + half, Math.min(this.arena.right - half, this.heartX + dx));
    this.heartY = Math.max(this.arena.top + half, Math.min(this.arena.bottom - half, this.heartY + dy));
  }

  /** 動いているか（毎コマかき直す必要があるか） */
  isAnimating() {
    return (this.running || this.shrinkStart >= 0) && !this.paused;
  }

  // ===================== 動かす =====================

  private shrinking = false;

  /** 1コマ進める（毎コマ呼ぶ） */
  frame() {
    if (!this.sized) return;
    const now = this.paused ? this.pausedAt : clock();
    // 四角をせまくしている途中
    this.shrinking = false;
    if (this.shrinkStart >= 0 && !this.paused) {
      const p = Math.min(1, (now - this.shrinkStart) / SHRINK_MS);
      const e = 1 - (1 - p) * (1 - p) * (1 - p); // はじめ速く、最後ゆっくり
      this.arenaScale = this.scaleFrom + (this.scaleTo - this.scaleFrom) * e;
      this.applyArena();
      this.shrinking = p < 1;
      if (!this.shrinking) this.shrinkStart = -1;
    }
    if (this.running && !this.paused) {
      const dt = Math.min(50, now - this.lastFrame) / 1000;
      this.lastFrame = now;
      this.update(now, dt);
    }
  }

  private update(now: number, dt: number) {
    const elapsed = now - this.waveStart;
    if (elapsed >= this.waveLength) {
      this.running = false;
      this.shots = [];
      this.events.push({ type: 'end', noHit: !this.hitThisWave });
      return;
    }
    // 新しい物を出す
    if (elapsed < this.waveLength - SPAWN_STOP_MS && this.pattern >= 0) {
      if (now >= this.patternNext) this.patternNext = now + this.spawnPattern(now);
    } else if (elapsed < this.waveLength - SPAWN_STOP_MS) {
      this.patterns.forEach((k, i) => {
        if (now >= this.nextSpawn[i]) {
          this.spawn(k, now);
          this.nextSpawn[i] = k === PC ? now + this.pcInterval : now + this.interval(k) / this.speed / this.density;
        }
      });
    }
    // 動かす・外に出た物を消す
    const a = this.arena;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      if (s.type >= STAMP) {
        if (this.updatePrincipal(s, now, dt)) this.shots.splice(i, 1);
        continue;
      }
      if (s.type === PC && now < s.dropAt) continue; // 予告中は動かない
      if (s.snipe && now < s.dashAt) {
        // 狙い撃ちの準備中：はじめはハートの方を向き続け、lockAt からは向きを固定して止まる
        if (now < s.lockAt) s.angle = deg(Math.atan2(this.heartY - s.y, this.heartX - s.x));
        continue;
      }
      if (s.snipe && s.vx === 0 && s.vy === 0) {
        // 飛び出す！
        const r = rad(s.angle);
        s.vx = Math.cos(r) * s.dashSpeed;
        s.vy = Math.sin(r) * s.dashSpeed;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.type === PC && !s.landed && s.y + s.h / 2 >= a.bottom) {
        s.landed = true; // ドスン！
        se('se_pc_impact');
        this.events.push({ type: 'impact' });
      }
      if (s.type === MOUSE && s.homingLeft > 0) {
        // ハートの方へ、少しずつ向きを変える（急には曲がれないので、よけられる）
        s.homingLeft -= dt;
        const v = Math.hypot(s.vx, s.vy);
        let cur = Math.atan2(s.vy, s.vx);
        const want = Math.atan2(this.heartY - s.y, this.heartX - s.x);
        const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        const maxTurn = MOUSE_TURN * dt;
        cur += Math.max(-maxTurn, Math.min(maxTurn, diff));
        s.vx = Math.cos(cur) * v;
        s.vy = Math.sin(cur) * v;
        s.angle = deg(cur) + 90;
      }
      if (s.type === MOUSE && s.bounceLeft > 0) {
        s.bounceLeft -= dt;
        if (s.x < a.left + s.h / 2 || s.x > a.right - s.h / 2) s.vx = -s.vx;
        if (s.y < a.top + s.h / 2 || s.y > a.bottom - s.h / 2) s.vy = -s.vy;
        s.angle = deg(Math.atan2(s.vy, s.vx)) + 90; // 進む方を向く
      }
      const margin = Math.max(s.w, s.h);
      if (now - s.born < 2500) continue; // 出てすぐの物は消さない（四角の外から入ってくる物があるため）
      if (s.x < a.left - margin * 2 || s.x > a.right + margin * 2 || s.y < a.top - margin * 2 || s.y > a.bottom + margin * 2) {
        this.shots.splice(i, 1);
      }
    }
    // 当たったか
    if (now >= this.guardUntil) {
      for (const s of this.shots) {
        if (s.type === PC && now < s.dropAt) continue;
        if (s.snipe && now < s.dashAt) continue; // 狙っている間は当たらない
        if (this.hits(s, now)) {
          this.guardUntil = now + HIT_GUARD_MS;
          this.hitThisWave = true;
          this.events.push({ type: 'hit' });
          break;
        }
      }
    }
  }

  /** 種類ごとの、出てくる間かく（ミリ秒） */
  private interval(type: number) {
    switch (type) {
      case CHALK:
        return 520;
      case PEN:
        return 380;
      case MOUSE:
        return 1300;
      default:
        return DODGE_PC_INTERVAL_MS;
    }
  }

  /** 物を1つ出す（ランダムなこうげき） */
  private spawn(type: number, now: number) {
    const H = height(this.base);
    const W = width(this.base);
    const a = this.arena;
    const AH = height(a);
    const AW = width(a);
    const s = newShot(type, now);
    switch (type) {
      case CHALK: {
        s.w = H * 0.18;
        s.h = s.w * this.ratio(this.img.chalk);
        const fromLeft = rnd() < 0.5;
        s.x = fromLeft ? a.left - s.w : a.right + s.w;
        s.y = a.top + s.h + rnd() * (AH - s.h * 2);
        s.vx = (fromLeft ? 1 : -1) * W * 0.5 * this.speed;
        break;
      }
      case PEN: {
        s.w = H * 0.26;
        s.h = s.w * this.ratio(this.img.pen);
        s.x = a.left + s.h + rnd() * (AW - s.h * 2);
        s.y = a.top - s.w;
        s.vy = H * 1.5 * this.speed;
        s.angle = 90;
        break;
      }
      case MOUSE: {
        s.h = H * 0.16;
        s.w = s.h / this.ratio(this.img.mouse);
        s.x = a.left + s.h + rnd() * (AW - s.h * 2);
        s.y = a.top + s.h / 2;
        const ang = rad(30 + randInt(120));
        const v = H * 0.6 * this.speed;
        s.vx = Math.cos(ang) * v;
        s.vy = Math.sin(ang) * v;
        s.bounceLeft = 3;
        s.angle = deg(Math.atan2(s.vy, s.vx)) + 90;
        break;
      }
      default: {
        s.w = H * 0.32;
        s.h = s.w * this.ratio(this.img.pc);
        s.x = Math.max(a.left + s.w / 2, Math.min(a.right - s.w / 2, this.heartX));
        s.y = a.top - s.h / 2;
        s.vy = H * 1.6 * this.speed;
        s.dropAt = now + 700 / this.speed;
        break;
      }
    }
    this.shots.push(s);
  }

  /** パターンの物を1回分出して、次に出すまでの時間（ミリ秒）を返す */
  private spawnPattern(now: number): number {
    // 大きさ・速さは「元の四角」で決める（わくがせまくなっても、物は小さくならない）
    const H = height(this.base);
    const W = width(this.base);
    // 出てくる場所は「今の四角」で決める
    const a = this.arena;
    const AH = height(a);
    const AW = width(a);
    const speed = this.speed;
    switch (this.pattern) {
      case P_CHALK_WALL: {
        // たてに並んだチョークの列。すき間は前の列から少しだけずらす（読めば通れる）
        const cw = H * 0.18;
        const ch = cw * this.ratio(this.img.chalk);
        const gap = this.heartSize * 2.6;
        const move = (rnd() * 2 - 1) * AH * 0.35;
        this.gapY = Math.max(a.top + gap / 2 + ch, Math.min(a.bottom - gap / 2 - ch, this.gapY + move));
        const fromLeft = this.patternStep % 2 === 0; // 左右から交互に
        for (let y = a.top + ch / 2; y < a.bottom; y += ch * 1.5) {
          if (Math.abs(y - this.gapY) < gap / 2) continue; // ここがすき間
          const s = newShot(CHALK, now);
          s.w = cw;
          s.h = ch;
          s.x = fromLeft ? a.left - cw : a.right + cw;
          s.y = y;
          s.vx = (fromLeft ? 1 : -1) * W * 0.75 * speed; // 速め
          this.shots.push(s);
        }
        this.patternStep++;
        se('se_chalk_wall');
        return 850 / speed; // 次の壁まで（短め）
      }
      case P_PEN_SNIPE: {
        // わくのはし（内がわ）に1本。ハートから遠い場所を選ぶ
        const pw = H * 0.26;
        const ph = pw * this.ratio(this.img.pen);
        const s = newShot(PEN, now);
        s.w = pw;
        s.h = ph;
        const inset = pw * 0.6;
        for (let tryNo = 0; tryNo < 6; tryNo++) {
          switch (randInt(4)) {
            case 0:
              s.x = a.left + inset + rnd() * (AW - inset * 2);
              s.y = a.top + inset;
              break;
            case 1:
              s.x = a.left + inset + rnd() * (AW - inset * 2);
              s.y = a.bottom - inset;
              break;
            case 2:
              s.x = a.left + inset;
              s.y = a.top + inset + rnd() * (AH - inset * 2);
              break;
            default:
              s.x = a.right - inset;
              s.y = a.top + inset + rnd() * (AH - inset * 2);
              break;
          }
          if (Math.hypot(s.x - this.heartX, s.y - this.heartY) > Math.min(AW, AH) * 0.45) break; // 近すぎたら選び直す
        }
        s.snipe = true;
        s.angle = deg(Math.atan2(this.heartY - s.y, this.heartX - s.x));
        s.lockAt = now + 550 / speed; // ① ハートを追って向きを合わせる
        s.dashAt = s.lockAt + 300 / speed; // ② 向きを固定して、少し止まる
        s.dashSpeed = H * 3.2 * speed; // ③ 一直線に飛ぶ
        this.shots.push(s);
        se('se_pen_lock');
        return 650 / speed;
      }
      case P_MOUSE_HOMING: {
        // わくの外のどこかから1匹ずつ。ハートをねらって、曲がりながら追いかける
        const mh = H * 0.16;
        const s = newShot(MOUSE, now);
        s.h = mh;
        s.w = mh / this.ratio(this.img.mouse);
        switch (randInt(4)) {
          case 0:
            s.x = a.left + rnd() * AW;
            s.y = a.top - mh;
            break;
          case 1:
            s.x = a.left + rnd() * AW;
            s.y = a.bottom + mh;
            break;
          case 2:
            s.x = a.left - mh;
            s.y = a.top + rnd() * AH;
            break;
          default:
            s.x = a.right + mh;
            s.y = a.top + rnd() * AH;
            break;
        }
        const ang = Math.atan2(this.heartY - s.y, this.heartX - s.x);
        const v = H * 0.75 * speed; // ギリギリ逃げられるくらい
        s.vx = Math.cos(ang) * v;
        s.vy = Math.sin(ang) * v;
        s.angle = deg(ang) + 90;
        s.homingLeft = 3.0; // 3秒追いかけたら、まっすぐ飛んでいく
        this.shots.push(s);
        se('se_mouse', 0.6);
        return 900 / speed;
      }
      case P_STAMP: {
        // ハートのいる所（少しずらす）に予告。3回に1回は、ほかの場所に大きいハンコを押して道をふさぐ
        const big = this.patternStep % 3 === 2;
        this.spawnStamp(now, big, STAMP_WARN_MS);
        this.patternStep++;
        return STAMP_EVERY_MS / speed;
      }
      case P_CHIME:
      case P_CHIME_SPIN: {
        if (this.patternStep === 0) {
          // はじめに、まん中に鐘を置く（点めつしている間は、さわっても平気）
          const b = newShot(BELL, now);
          b.w = this.heartSize * 1.8;
          b.x = cx(a);
          b.y = cy(a);
          b.dropAt = now + BELL_WARN_MS;
          this.shots.push(b);
          se('se_chime'); // キーンコーンカーンコーン
          this.gapY = randInt(360); // すき間の向き（gapY を角度に使う）
          this.patternStep++;
          return BELL_WARN_MS;
        }
        // 鐘から輪を1つ出す。すき間の向きは、前の輪から少しだけ回す（読めば通れる）
        const s = newShot(RING, now);
        s.x = cx(a);
        s.y = cy(a);
        s.w = this.heartSize * 0.9; // 今の半径
        s.h = this.heartSize * 0.55; // 輪の太さ
        s.vx = H * 0.32 * speed; // 1秒に広がる量
        this.gapY += (rnd() < 0.5 ? 1 : -1) * (40 + randInt(50));
        if (this.pattern === P_CHIME) {
          // 第1形態（すき間が回らない）：すき間がほぼ真上・真下を向くと逃げ場がなくなるので、横に寄せる
          const ang = ((this.gapY % 180) + 180) % 180; // 0〜180度
          if (ang > 60 && ang < 120) this.gapY += ang < 90 ? 60 - ang : 120 - ang;
        }
        s.gapDir = this.gapY;
        if (this.pattern === P_CHIME_SPIN) {
          // 第2形態：広がりながら、すき間が回る（回る向きは輪ごとにランダム）
          s.spin = (rnd() < 0.5 ? 1 : -1) * RING_GAP_SPIN * speed;
        }
        this.shots.push(s);
        se('se_ring', 0.6);
        this.patternStep++;
        return RING_EVERY_MS / speed;
      }
      case P_CLOCK: {
        this.spawnClock(now, 1);
        return this.waveLength; // このこうげきの間は、もう出さない
      }
      case P_CLOCK_STAMP: {
        // 時計の針（少しおそめ）＋ハートをねらうハンコ（ゆっくりめ）
        if (this.patternStep === 0) {
          this.spawnClock(now, COMBO_HAND_RATE);
          this.patternStep++;
          return HAND_WARN_MS + 600; // 針が動き出してから、ハンコを始める
        }
        this.spawnStamp(now, false, COMBO_STAMP_WARN_MS);
        this.patternStep++;
        return COMBO_STAMP_EVERY_MS / speed;
      }
      case P_PAPERS: {
        if (this.patternStep === 0) {
          // 列を決めて、山の高さを0にする
          this.paperCols = Math.max(5, Math.min(9, Math.trunc(AW / (this.heartSize * 1.7))));
          this.paperTop = new Array<number>(this.paperCols).fill(a.bottom);
        }
        this.spawnPaper(now);
        this.patternStep++;
        return PAPER_EVERY_MS / speed;
      }
      case P_MIC: {
        // ゆれながら流れる通り道（外がわが音波）。はじめは広く、だんだんせまくなる
        const s = newShot(WAVE, now);
        s.w = AW * 0.85;
        s.h = AH * 0.26;
        s.vx = AW * 0.32 * speed;
        s.x = rnd() * s.w;
        s.gapDir = this.heartSize * 1.5;
        this.shots.push(s);
        return this.waveLength;
      }
      default: {
        // P_PC_ROW：わくのはしからはしまで、パソコンを横一列に。ランダムな1列だけ空ける
        const bw = H * 0.32;
        const h = bw * this.ratio(this.img.pc);
        const cols = Math.max(3, Math.trunc(AW / bw));
        const colW = AW / cols;
        const safe = randInt(cols);
        for (let k = 0; k < cols; k++) {
          if (k === safe) continue; // 逃げ道
          const s = newShot(PC, now);
          s.w = colW;
          s.h = h;
          s.x = a.left + (k + 0.5) * colW;
          s.y = a.top - h / 2;
          s.vy = H * 2.4 * speed; // 速め
          s.dropAt = now + 550 / speed; // 赤い予告のあと、いっせいに落ちる
          this.shots.push(s);
        }
        return 1300 / speed;
      }
    }
  }

  /** 書類を1つ落とす（ときどきハートのいる列をねらう。上限まで積もった列には落とさない） */
  private spawnPaper(now: number) {
    const a = this.arena;
    const H = height(this.base);
    const colW = width(a) / this.paperCols;
    const thick = H * PAPER_THICK;
    const full = a.bottom - height(a) * PAPER_MAX; // ここより上には積もらない
    const heartCol = Math.max(0, Math.min(this.paperCols - 1, Math.trunc((this.heartX - a.left) / colW)));
    let c = rnd() < PAPER_AIM ? heartCol : randInt(this.paperCols);
    for (let k = 0; k < this.paperCols && this.paperTop[c] - thick < full; k++) c = (c + 1) % this.paperCols; // いっぱいなら となりへ
    if (this.paperTop[c] - thick < full) return; // 全部いっぱい
    const s = newShot(PAPER, now);
    s.col = c;
    s.w = colW * 0.92;
    s.h = thick;
    s.x = a.left + (c + 0.5) * colW + (rnd() * 2 - 1) * colW * 0.04; // 少しずらして、山っぽく
    s.y = a.top - thick / 2;
    s.vy = H * PAPER_FALL * this.speed;
    s.dropAt = now + PAPER_WARN_MS / this.speed;
    this.shots.push(s);
  }

  /** ハンコを1つ出す（big：ハートと関係ない場所に、大きいハンコ） */
  private spawnStamp(now: number, big: boolean, warnMs: number) {
    const a = this.arena;
    const H = height(this.base);
    const r = H * STAMP_SIZE * (big ? STAMP_BIG_RATE : 1); // ハンコの半径
    const s = newShot(STAMP, now);
    s.w = r * 2;
    const tx = big ? a.left + rnd() * width(a) : this.heartX + (rnd() * 2 - 1) * this.heartSize * 0.6;
    const ty = big ? a.top + rnd() * height(a) : this.heartY + (rnd() * 2 - 1) * this.heartSize * 0.6;
    const mx = Math.min(r * 0.6, width(a) / 2);
    const my = Math.min(r * 0.6, height(a) / 2);
    s.x = Math.max(a.left + mx, Math.min(a.right - mx, tx));
    s.y = Math.max(a.top + my, Math.min(a.bottom - my, ty));
    s.dropAt = now + warnMs / this.speed; // この時刻に押される
    this.shots.push(s);
    se('se_stamp_warn', 0.5);
  }

  /** 時計の針を出す：長い針（わくのはしまで）と短い針。はじめはハートと反対を向く */
  private spawnClock(now: number, spinRate: number) {
    const a = this.arena;
    const AW = width(a);
    const AH = height(a);
    const heartDeg = deg(Math.atan2(this.heartY - cy(a), this.heartX - cx(a)));
    const dir = rnd() < 0.5 ? 1 : -1;
    const l = newShot(HAND, now);
    l.x = cx(a);
    l.y = cy(a);
    l.w = Math.hypot(AW, AH) / 2 + this.heartSize;
    l.h = this.heartSize * 0.45;
    l.angle = heartDeg + 180;
    l.spin = dir * HAND_SPIN * spinRate * this.speed;
    l.flipEvery = HAND_FLIP_MS / this.speed;
    l.flipAt = now + HAND_WARN_MS + l.flipEvery;
    l.dropAt = now + HAND_WARN_MS;
    l.face = true;
    const sh = newShot(HAND, now);
    sh.x = l.x;
    sh.y = l.y;
    sh.w = AH * 0.28;
    sh.h = this.heartSize * 0.6;
    sh.angle = heartDeg + 90;
    sh.spin = -dir * HAND_SPIN * 0.55 * spinRate * this.speed;
    sh.flipAt = NEVER; // 短い針は逆回りしない
    sh.dropAt = l.dropAt;
    this.shots.push(l, sh);
  }

  /** 校長のこうげきを1コマ分動かす。消すときは true を返す */
  private updatePrincipal(s: Shot, now: number, dt: number): boolean {
    switch (s.type) {
      case STAMP:
        if (!s.landed && now >= s.dropAt) {
          s.landed = true; // ドン！
          se('se_stamp');
          this.events.push({ type: 'impact' });
        }
        return now > s.dropAt + STAMP_HIT_MS + STAMP_MARK_MS;
      case RING:
        s.w += s.vx * dt; // 広がる
        s.gapDir += s.spin * dt; // すき間が回る（第1形態は spin が0なので回らない）
        return s.w > Math.hypot(width(this.arena), height(this.arena)) / 2 + s.h;
      case HAND:
        if (now < s.dropAt) return false;
        s.angle += s.spin * dt;
        if (!s.landed && s.flipAt !== NEVER && now > s.flipAt - FLIP_WARN_MS) {
          s.landed = true; // 逆回りの前の警告音（1回だけ）
          se('se_clock_warn');
        }
        if (now >= s.flipAt) {
          s.spin = -s.spin; // 逆回り！
          s.flipAt += s.flipEvery;
          s.landed = false;
        }
        return false;
      case WAVE:
        s.x += s.vx * dt; // 流れる
        return false;
      case PAPER: {
        if (now < s.dropAt || s.landed) return false;
        s.y += s.vy * dt; // 落ちる
        const land = this.paperTop[s.col] - s.h / 2;
        if (s.y >= land) {
          s.y = land; // 山の上に乗る
          s.landed = true;
          this.paperTop[s.col] -= s.h;
          se('se_paper', 0.7);
        }
        return false;
      }
      default: // BELL：動かない
        return false;
    }
  }

  /** 音波：今の通り道の半分のはば（はじめは広く、だんだんせまくなる） */
  private waveHalf(s: Shot, now: number) {
    const p = Math.min(1, (now - s.born) / WAVE_OPEN_MS);
    const open = height(this.arena);
    return open + (s.gapDir - open) * p;
  }

  /** 音波：横の位置 x での、通り道のまん中の高さ */
  private waveCenter(s: Shot, x: number) {
    return cy(this.arena) + s.h * Math.sin((2 * Math.PI * (x - this.arena.left + s.x)) / s.w);
  }

  /** ハートが物に当たっているか（物の向きに合わせて調べる） */
  private hits(s: Shot, now: number): boolean {
    const r = this.heartSize * 0.3; // ハートの当たり判定は、見た目より少し小さく
    const hx = this.heartX;
    const hy = this.heartY;
    switch (s.type) {
      case STAMP: // 押されてから少しの間だけ
        if (now < s.dropAt || now > s.dropAt + STAMP_HIT_MS) return false;
        return Math.hypot(hx - s.x, hy - s.y) < s.w / 2 + r;
      case BELL:
        if (now < s.dropAt) return false;
        return Math.hypot(hx - s.x, hy - s.y) < s.w / 2 + r;
      case RING: {
        const dist = Math.hypot(hx - s.x, hy - s.y);
        if (Math.abs(dist - s.w) > s.h / 2 + r) return false; // 輪の上にいない
        const d = deg(Math.atan2(hy - s.y, hx - s.x));
        // すき間は向かい合わせに2つ（180度ちがい）なので、近い方のすき間との差（0〜90度）
        const diff = Math.abs(((((d - s.gapDir) % 180) + 270) % 180) - 90);
        const margin = deg(r / Math.max(1, dist)); // ハートの大きさの分
        return diff > RING_GAP_DEG / 2 - margin;
      }
      case HAND: {
        if (now < s.dropAt) return false;
        const a = rad(s.angle);
        const dx = hx - s.x;
        const dy = hy - s.y;
        const along = dx * Math.cos(a) + dy * Math.sin(a); // 針にそった長さ
        const side = -dx * Math.sin(a) + dy * Math.cos(a); // 針からのはなれ
        return along > -s.h && along < s.w && Math.abs(side) < s.h / 2 + r;
      }
      case WAVE:
        return Math.abs(hy - this.waveCenter(s, hx)) > this.waveHalf(s, now) - r;
      case PAPER: // 落ちている書類も、積もった書類も当たる
        if (now < s.dropAt) return false;
        return Math.abs(hx - s.x) < s.w / 2 + r && Math.abs(hy - s.y) < s.h / 2 + r;
    }
    const a = rad(s.angle);
    const dx = hx - s.x;
    const dy = hy - s.y;
    const lx = dx * Math.cos(a) + dy * Math.sin(a);
    const ly = -dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) < s.w * 0.45 + r && Math.abs(ly) < s.h * 0.45 + r;
  }

  // ===================== かく =====================

  private R(l: number, t: number, r: number, b: number) {
    return Skia.XYWHRect(l, t, r - l, b - t);
  }

  private image(c: SkCanvas, img: SkImage | null, l: number, t: number, r: number, b: number) {
    if (!img) return;
    c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), this.R(l, t, r, b), FilterMode.Nearest, MipmapMode.None, this.pixel);
  }

  /** 四角・物・ハートを全部かく */
  draw(c: SkCanvas) {
    if (!this.sized) return;
    const now = this.paused ? this.pausedAt : clock();
    const base = this.base;
    const a = this.arena;
    // せまくなった外がわは、赤黒いかべ
    if (width(a) < width(base) - 1) {
      this.fill.setColor(C(0xff3a0e12));
      c.drawRect(this.R(base.left, base.top, base.right, base.bottom), this.fill);
      this.fill.setColor(C(0x33ff5252)); // しましま
      const step = 12 * DP;
      c.save();
      c.clipRect(this.R(base.left, base.top, base.right, base.bottom), ClipOp.Intersect, false);
      for (let x = base.left - height(base); x < base.right; x += step * 2) {
        c.drawRect(this.R(x, base.top, x + step, base.bottom), this.fill);
      }
      c.restore();
    }
    // 四角（黒い地）
    this.fill.setColor(C(0xff000000));
    c.drawRect(this.R(a.left, a.top, a.right, a.bottom), this.fill);
    c.save();
    c.clipRect(this.R(a.left, a.top, a.right, a.bottom), ClipOp.Intersect, true);
    for (const s of this.shots) this.drawShot(c, s, now);
    // ハート（当たった直後は点めつ）
    const blink = now < this.guardUntil && blinkOn(now, 100);
    if (!blink) {
      const hw = this.heartSize / this.ratio(this.img.heart);
      this.image(c, this.img.heart, this.heartX - hw / 2, this.heartY - this.heartSize / 2, this.heartX + hw / 2, this.heartY + this.heartSize / 2);
    }
    c.restore();
    // わく（白。理事長戦は赤。せまくなる間は、赤と白で点めつ）
    if (this.shrinking) this.frameP.setColor(C(blinkOn(now, 80) ? 0xffff5252 : 0xffffffff));
    else this.frameP.setColor(C(this.bossFrame ? 0xffff5252 : 0xffffffff));
    c.drawRect(this.R(a.left, a.top, a.right, a.bottom), this.frameP);
  }

  /** 物を1つかく */
  private drawShot(c: SkCanvas, s: Shot, now: number) {
    if (s.type >= STAMP) {
      this.drawPrincipal(c, s, now);
      return;
    }
    const a = this.arena;
    if (s.snipe && now < s.dashAt) {
      // 狙い撃ちの予告線：狙っている間はうすく、向きを固定したら点めつ
      const locked = now >= s.lockAt;
      this.aim.setColor(C(locked ? (blinkOn(now, 70) ? 0xccff3030 : 0x44ff3030) : 0x55ff3030));
      const r = rad(s.angle);
      const len = width(this.base) + height(this.base);
      c.drawLine(s.x, s.y, s.x + Math.cos(r) * len, s.y + Math.sin(r) * len, this.aim);
    }
    if (s.type === PC && now < s.dropAt) {
      // 落ちてくる場所を、赤く点めつして予告する
      this.fill.setColor(C(blinkOn(now, 120) ? 0x55ff3030 : 0x22ff3030));
      c.drawRect(this.R(s.x - s.w / 2, a.top, s.x + s.w / 2, a.bottom), this.fill);
      return;
    }
    const img = s.type === CHALK ? this.img.chalk : s.type === PEN ? this.img.pen : s.type === MOUSE ? this.img.mouse : this.img.pc;
    c.save();
    c.translate(s.x, s.y);
    c.rotate(s.angle, 0, 0);
    this.image(c, img, -s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
    c.restore();
  }

  /** 校長のこうげきをかく */
  private drawPrincipal(c: SkCanvas, s: Shot, now: number) {
    const a = this.arena;
    const soft = this.soft;
    const line = this.line;
    switch (s.type) {
      case STAMP: {
        const r = s.w / 2;
        if (now < s.dropAt) {
          // 予告：赤い丸が点めつ。押される直前は、上からハンコが下りてくる
          soft.setColor(C(blinkOn(now, 110) ? 0x55ff3030 : 0x26ff3030));
          c.drawCircle(s.x, s.y, r, soft);
          line.setStrokeWidth(2 * DP);
          line.setColor(C(0xccff5050));
          c.drawCircle(s.x, s.y, r, line);
          const left = s.dropAt - now;
          if (left < 220) {
            const lift = (r * 3 * left) / 220;
            this.drawStampBody(c, s.x, s.y - lift, r);
          }
        } else {
          // 押したあと：赤いハンコのあと（だんだん消える）
          const fade = 1 - Math.min(1, (now - s.dropAt) / (STAMP_HIT_MS + STAMP_MARK_MS));
          const alpha = Math.trunc(255 * fade);
          const col = ((alpha << 24) | 0xe53935) >>> 0;
          line.setStrokeWidth(r * 0.14);
          line.setColor(C(col));
          c.drawCircle(s.x, s.y, r * 0.88, line);
          this.text.setColor(C(col));
          const font = dotFont(Math.max(1, Math.round(r * 0.62)));
          const label = '校長';
          const tw = font.measureText(label).width;
          c.drawText(label, s.x - tw / 2, s.y + r * 0.22, this.text, font);
          if (now < s.dropAt + STAMP_HIT_MS) this.drawStampBody(c, s.x, s.y, r);
        }
        break;
      }
      case BELL: {
        // 金色の鐘。さわると痛くなるまでは点めつ
        if (now < s.dropAt && blinkOn(now, 100)) break;
        const r = s.w / 2;
        soft.setColor(C(0xffffc107));
        c.drawCircle(s.x, s.y, r, soft);
        soft.setColor(C(0xffffe082));
        c.drawCircle(s.x - r * 0.3, s.y - r * 0.3, r * 0.35, soft);
        soft.setColor(C(0xff8d6e00));
        c.drawCircle(s.x, s.y + r * 0.55, r * 0.22, soft); // 鐘の玉
        break;
      }
      case RING: {
        // 黄色い音の輪（向かい合わせの2つのすき間の所は描かない）
        line.setStrokeWidth(s.h);
        line.setColor(C(0xffffe082));
        const oval = this.R(s.x - s.w, s.y - s.w, s.x + s.w, s.y + s.w);
        c.drawArc(oval, s.gapDir + RING_GAP_DEG / 2, 180 - RING_GAP_DEG, false, line);
        c.drawArc(oval, s.gapDir + 180 + RING_GAP_DEG / 2, 180 - RING_GAP_DEG, false, line);
        break;
      }
      case HAND: {
        if (s.face) {
          // 時計の文字ばん（うすく。当たらない）
          const fr = (Math.min(width(a), height(a)) / 2) * 0.92;
          line.setStrokeWidth(2 * DP);
          line.setColor(C(0x44ffffff));
          c.drawCircle(s.x, s.y, fr, line);
          line.setStrokeWidth(3 * DP);
          for (let k = 0; k < 12; k++) {
            const r = rad(k * 30);
            c.drawLine(s.x + Math.cos(r) * fr * 0.88, s.y + Math.sin(r) * fr * 0.88, s.x + Math.cos(r) * fr, s.y + Math.sin(r) * fr, line);
          }
        }
        // 針：出てすぐはうすく点めつ。逆回りの前は赤く点めつ
        let color = 0xffffffff;
        if (now < s.dropAt) color = blinkOn(now, 100) ? 0x66ffffff : 0x22ffffff;
        else if (now > s.flipAt - FLIP_WARN_MS) color = blinkOn(now, 80) ? 0xffff5252 : 0xffffffff;
        line.setStrokeWidth(s.h);
        line.setColor(C(color));
        const r = rad(s.angle);
        c.drawLine(s.x, s.y, s.x + Math.cos(r) * s.w, s.y + Math.sin(r) * s.w, line);
        soft.setColor(C(0xffffd54f));
        c.drawCircle(s.x, s.y, this.heartSize * 0.4, soft); // まん中の軸
        break;
      }
      case PAPER: {
        if (now < s.dropAt) {
          // 予告：落ちてくる列が、うすく点めつ
          const colW = width(a) / this.paperCols;
          const pcx = a.left + (s.col + 0.5) * colW;
          soft.setColor(C(blinkOn(now, 100) ? 0x33ffffff : 0x14ffffff));
          c.drawRect(this.R(pcx - colW / 2, a.top, pcx + colW / 2, this.paperTop[s.col]), soft);
          break;
        }
        // 白い紙に、文字の線とふち（積もった紙は少し暗く）
        const l = s.x - s.w / 2;
        const t = s.y - s.h / 2;
        const rr = s.x + s.w / 2;
        const b = s.y + s.h / 2;
        soft.setColor(C(s.landed ? 0xffdcd8cc : 0xfffaf8f0));
        c.drawRect(this.R(l, t, rr, b), soft);
        line.setStrokeWidth(Math.max(1, s.h * 0.08));
        line.setColor(C(0xff9e9a90));
        for (let k = 1; k <= 3; k++) {
          const y = t + (s.h * k) / 4;
          c.drawLine(l + s.w * 0.12, y, rr - s.w * (k === 3 ? 0.35 : 0.12), y, line);
        }
        line.setColor(C(0xff6d6a62));
        c.drawRect(this.R(l, t, rr, b), line);
        break;
      }
      case WAVE: {
        // 通り道の上と下を、水色の音波でぬる
        const half = this.waveHalf(s, now);
        const step = 4 * DP;
        soft.setColor(C(0x5540c4ff));
        for (let side = -1; side <= 1; side += 2) {
          const p = Skia.PathBuilder.Make();
          p.moveTo(a.left, side < 0 ? a.top : a.bottom);
          for (let x = a.left; x <= a.right + step; x += step) p.lineTo(x, this.waveCenter(s, x) + side * half);
          p.lineTo(a.right + step, side < 0 ? a.top : a.bottom);
          p.close();
          c.drawPath(p.detach(), soft);
        }
        line.setStrokeWidth(3 * DP);
        line.setColor(C(0xff80d8ff));
        for (let side = -1; side <= 1; side += 2) {
          const p = Skia.PathBuilder.Make();
          for (let x = a.left; x <= a.right + step; x += step) {
            const y = this.waveCenter(s, x) + side * half;
            if (x === a.left) p.moveTo(x, y);
            else p.lineTo(x, y);
          }
          c.drawPath(p.detach(), line);
        }
        break;
      }
    }
  }

  /** ハンコの本体（茶色い持ち手＋赤い印面） */
  private drawStampBody(c: SkCanvas, x: number, bottom: number, r: number) {
    const soft = this.soft;
    soft.setColor(C(0xff8d5a3b));
    c.drawRect(this.R(x - r * 0.45, bottom - r * 2.2, x + r * 0.45, bottom - r * 0.25), soft);
    soft.setColor(C(0xffa86f4c));
    c.drawRect(this.R(x - r * 0.45, bottom - r * 2.2, x - r * 0.2, bottom - r * 0.25), soft);
    soft.setColor(C(0xffc62828));
    c.drawRect(this.R(x - r * 0.6, bottom - r * 0.3, x + r * 0.6, bottom), soft);
  }
}
