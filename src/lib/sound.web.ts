import { Asset } from 'expo-asset';

import {
  JINGLE_VOLUME,
  SE_NAMES,
  SE_VOLUME,
  SOUNDS,
  bgmVolume,
  type BgmName,
  type JingleName,
  type SeName,
  type SoundName,
} from '@/data/sounds';

/**
 * 音の係（Web 用。スマホのアプリは sound.ts）。使い方は sound.ts と同じ。
 * ブラウザの音のしくみ（Web Audio）を使う：
 *   ・iPhone の Safari でも音の大きさを変えられる（ふつうの方法だと、いつも最大になる）
 *   ・効果音を重ねて鳴らせて、鳴るまでのおくれも少ない
 * ブラウザは「画面を1回タップするまで音を出せない」決まりなので、
 * 最初のタップで unlockSound() を呼んで、音を出せるようにする
 */

const PAUSE_DELAY_MS = 400; // 画面を離れてから、BGMを止めるまでの時間

// 何も鳴らない、ごく短い音（タップのときに、BGM・ジングルの再生を許可してもらうために使う）
const SILENT_WAV =
  'data:audio/wav;base64,UklGRpYDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

let ctx: AudioContext | null = null;
let seGain: GainNode | null = null;
const seBuffers = new Map<SeName, AudioBuffer>(); // 読みこみ終わった効果音

// BGM とジングルは、それぞれ1つの <audio> を使い回す（iPhone では、タップで許可した <audio> しか鳴らせないため）
type Track = { el: HTMLAudioElement; gain: GainNode };
let bgmTrack: Track | null = null;
let jingleTrack: Track | null = null;
let bgmNow: BgmName | null = null;
let jingleOn = false; // ジングルを流している途中か
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

// タブが裏に回ったとき、鳴っていたもの
let bgmWasPlaying = false;
let jingleWasPlaying = false;

const uri = (name: SoundName) => Asset.fromModule(SOUNDS[name]).uri;

function makeTrack(c: AudioContext): Track {
  const el = new Audio(SILENT_WAV);
  el.preload = 'auto';
  const gain = c.createGain();
  c.createMediaElementSource(el).connect(gain);
  gain.connect(c.destination);
  return { el, gain };
}

const isPlaying = (t: Track | null) => !!t && !t.el.paused && !t.el.ended;
const play = (t: Track) => t.el.play().catch(() => {}); // まだ許可がないときは、何もしない

/** はじめに1回呼ぶ（何回呼んでもよい）。効果音を読みこむ */
export function initSound() {
  if (ctx || typeof window === 'undefined') return;
  ctx = new AudioContext();
  seGain = ctx.createGain();
  seGain.connect(ctx.destination);
  bgmTrack = makeTrack(ctx);
  bgmTrack.el.loop = true;
  jingleTrack = makeTrack(ctx);
  jingleTrack.el.addEventListener('ended', () => {
    jingleOn = false;
  });

  // 効果音は、全部読みこんでおく（短いので、すぐ鳴らせるように）
  const c = ctx;
  for (const name of SE_NAMES) {
    fetch(uri(name))
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .then((buf) => seBuffers.set(name, buf))
      .catch(() => {});
  }

  // 最初のタップ・キー入力で、音を出せるようにする
  const unlock = () => unlockSound();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  // タブが裏に回ったら止めて、もどってきたら続きから
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bgmWasPlaying = isPlaying(bgmTrack);
      jingleWasPlaying = isPlaying(jingleTrack);
      bgmTrack?.el.pause();
      jingleTrack?.el.pause();
      ctx?.suspend();
    } else {
      ctx?.resume();
      if (bgmWasPlaying && bgmTrack) play(bgmTrack);
      if (jingleWasPlaying && jingleTrack) play(jingleTrack);
      bgmWasPlaying = jingleWasPlaying = false;
    }
  });
}

let unlocked = false;

/** タップされたときに呼ぶ。ブラウザに、音を出す許可をもらう */
export function unlockSound() {
  initSound();
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume();
  if (unlocked) return;
  unlocked = true;
  // BGM・ジングルの <audio> を、タップの中で1回鳴らして許可をもらう
  for (const t of [bgmTrack, jingleTrack]) {
    if (!t) continue;
    if (t === bgmTrack && bgmNow) {
      play(t); // タップ前に流そうとしていた曲があれば、ここで流す
    } else {
      t.el.play().then(() => {
        if (t.el.src.startsWith('data:')) t.el.pause();
      }).catch(() => {});
    }
  }
}

// ===================== 効果音 =====================

/** 効果音を鳴らす（rate：ふだんの何倍の大きさか。足音などは小さめに） */
export function se(name: SeName, rate = 1) {
  initSound();
  const buf = seBuffers.get(name);
  if (!ctx || !seGain || !buf || ctx.state !== 'running') return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = Math.min(1, SE_VOLUME * rate);
  src.connect(g);
  g.connect(seGain);
  src.start();
}

// ===================== BGM =====================

function cancelPause() {
  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = null;
}

/** BGMを流す。同じ曲が流れていれば、そのまま続ける（止まっていたら続きから） */
export function bgm(name: BgmName) {
  initSound();
  cancelPause();
  stopJingle();
  if (!bgmTrack) return;
  if (bgmNow !== name) {
    bgmTrack.el.src = uri(name);
    bgmTrack.gain.gain.value = bgmVolume(name);
    bgmNow = name;
  }
  if (!isPlaying(bgmTrack)) play(bgmTrack);
}

/** 止めていたBGMを、続きから流す（メニューから戻ったときなど） */
export function resumeBgm() {
  cancelPause();
  if (bgmTrack && bgmNow && !isPlaying(bgmTrack) && !jingleOn) play(bgmTrack);
}

/** 画面を離れるときに呼ぶ。少し待って、次の画面が曲を流さなければ止める */
export function pauseBgmSoon() {
  cancelPause();
  pauseTimer = setTimeout(() => bgmTrack?.el.pause(), PAUSE_DELAY_MS);
  jingleTrack?.el.pause();
}

/** すぐにBGMを止める（一時停止メニューなど） */
export function pauseBgm() {
  cancelPause();
  bgmTrack?.el.pause();
}

/** BGMを終わらせる */
export function stopBgm() {
  bgmTrack?.el.pause();
  bgmNow = null;
}

// ===================== ジングル =====================

/** ジングル（勝ったとき・負けたときなどの短い曲）を1回流す。BGMは終わらせる */
export function jingle(name: JingleName) {
  initSound();
  cancelPause();
  stopBgm();
  if (!jingleTrack) return;
  jingleTrack.el.src = uri(name);
  jingleTrack.gain.gain.value = JINGLE_VOLUME;
  jingleOn = true;
  play(jingleTrack);
}

/** 止めていたジングルを続きから流す */
export function resumeJingle() {
  if (jingleTrack && jingleOn && !isPlaying(jingleTrack)) play(jingleTrack);
}

export function stopJingle() {
  jingleTrack?.el.pause();
  jingleOn = false;
}
