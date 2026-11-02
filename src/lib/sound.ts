import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import {
  JINGLE_VOLUME,
  SE_MANY,
  SE_NAMES,
  SE_VOLUME,
  SOUNDS,
  bgmVolume,
  type BgmName,
  type JingleName,
  type SeName,
} from '@/data/sounds';

/**
 * 音の係（スマホのアプリ用。Web は sound.web.ts）。Java版の Sound と同じ使い方。
 *   BGM     ：bgm('bgm_map')     ずっとくり返す。同じ曲なら続きから流れ続ける
 *   ジングル：jingle('jg_win')   1回だけ流す（BGMは止まる）
 *   効果音  ：se('se_ok')
 * 画面でBGMを流すときは、useBgm('bgm_map') を使うと、画面を離れたときの処理も自動でやる
 */

const PAUSE_DELAY_MS = 400; // 画面を離れてから、BGMを止めるまでの時間

let ready = false;
const sePlayers = new Map<SeName, AudioPlayer[]>(); // 効果音ごとのプレイヤー（重ねて鳴らせるように複数）
const seNext = new Map<SeName, number>(); // 次に使うプレイヤーの番号

let bgmPlayer: AudioPlayer | null = null;
let bgmNow: BgmName | null = null;
let jinglePlayer: AudioPlayer | null = null;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

// アプリが裏に回ったとき、鳴っていたもの
let bgmWasPlaying = false;
let jingleWasPlaying = false;

/** はじめに1回呼ぶ（何回呼んでもよい）。効果音を読みこむ */
export function initSound() {
  if (ready) return;
  ready = true;
  for (const name of SE_NAMES) {
    const n = SE_MANY[name] ?? 1;
    sePlayers.set(
      name,
      Array.from({ length: n }, () => createAudioPlayer(SOUNDS[name])),
    );
    seNext.set(name, 0);
  }
  // アプリが裏に回ったら止めて、もどってきたら続きから
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      if (bgmWasPlaying) bgmPlayer?.play();
      if (jingleWasPlaying) jinglePlayer?.play();
      bgmWasPlaying = jingleWasPlaying = false;
    } else if (state === 'background') {
      bgmWasPlaying = !!bgmPlayer?.playing;
      jingleWasPlaying = !!jinglePlayer?.playing;
      bgmPlayer?.pause();
      jinglePlayer?.pause();
    }
  });
}

/** Web で音を鳴らせるようにする（スマホのアプリでは何もしない） */
export function unlockSound() {}

// ===================== 効果音 =====================

/** 効果音を鳴らす（rate：ふだんの何倍の大きさか。足音などは小さめに） */
export function se(name: SeName, rate = 1) {
  initSound();
  const list = sePlayers.get(name);
  if (!list) return;
  const i = seNext.get(name) ?? 0;
  seNext.set(name, (i + 1) % list.length);
  const p = list[i];
  p.volume = Math.min(1, SE_VOLUME * rate);
  p.seekTo(0);
  p.play();
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
  if (bgmPlayer && bgmNow === name) {
    if (!bgmPlayer.playing) bgmPlayer.play();
    return;
  }
  stopBgm();
  const p = createAudioPlayer(SOUNDS[name]);
  p.loop = true;
  p.volume = bgmVolume(name);
  p.play();
  bgmPlayer = p;
  bgmNow = name;
}

/** 止めていたBGMを、続きから流す（メニューから戻ったときなど） */
export function resumeBgm() {
  cancelPause();
  if (bgmPlayer && !bgmPlayer.playing && !jinglePlayer) bgmPlayer.play();
}

/** 画面を離れるときに呼ぶ。少し待って、次の画面が曲を流さなければ止める */
export function pauseBgmSoon() {
  cancelPause();
  pauseTimer = setTimeout(() => bgmPlayer?.pause(), PAUSE_DELAY_MS);
  jinglePlayer?.pause();
}

/** すぐにBGMを止める（一時停止メニューなど） */
export function pauseBgm() {
  cancelPause();
  bgmPlayer?.pause();
}

/** BGMを終わらせる */
export function stopBgm() {
  bgmPlayer?.remove();
  bgmPlayer = null;
  bgmNow = null;
}

// ===================== ジングル =====================

/** ジングル（勝ったとき・負けたときなどの短い曲）を1回流す。BGMは終わらせる */
export function jingle(name: JingleName) {
  initSound();
  cancelPause();
  stopBgm();
  stopJingle();
  const p = createAudioPlayer(SOUNDS[name]);
  p.volume = JINGLE_VOLUME;
  p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish && jinglePlayer === p) stopJingle();
  });
  p.play();
  jinglePlayer = p;
}

/** 止めていたジングルを続きから流す */
export function resumeJingle() {
  if (jinglePlayer && !jinglePlayer.playing) jinglePlayer.play();
}

export function stopJingle() {
  jinglePlayer?.remove();
  jinglePlayer = null;
}
