import { Platform } from 'react-native';

/**
 * Web で遊ぶときのための係（スマホのアプリでは何もしない）。
 *   ・画面いっぱいに広げる設定・「ホーム画面に追加」の設定は public/index.html に書いてある
 *     （iPhone の Safari は、ページを開いたときの設定しか読まないため）
 *   ・全画面にする／やめる
 */

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

/** この画面で全画面にできるか（iPhone の Safari はできない） */
export function canFullscreen(): boolean {
  if (!isWeb) return false;
  const d = document as FsDoc;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

/** 今、全画面か */
export function isFullscreen(): boolean {
  if (!isWeb) return false;
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** 「ホーム画面に追加」から開いているか（このときは、はじめから全画面） */
export function isStandalone(): boolean {
  if (!isWeb || typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // 全画面ボタンで全画面にしたときも「fullscreen」になるので、それは数えない
    (window.matchMedia?.('(display-mode: fullscreen)').matches && !isFullscreen())
  );
}

/** 全画面にする（タップしたときに呼ぶ。できない画面では、何もしない） */
export function enterFullscreen() {
  if (!isWeb || isFullscreen() || !canFullscreen()) return;
  const el = document.documentElement as FsEl;
  const done = () => {
    // 全画面にできたら、横向きに固定する（Android の Chrome など）
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.('landscape').catch(() => {});
  };
  if (el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(done).catch(() => {});
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
    done();
  }
}

/** 全画面をやめる */
export function exitFullscreen() {
  if (!isWeb || !isFullscreen()) return;
  const d = document as FsDoc;
  if (d.exitFullscreen) d.exitFullscreen().catch(() => {});
  else d.webkitExitFullscreen?.();
}

/** 全画面が変わったときに知らせてもらう（もどり値で、知らせるのをやめる） */
export function onFullscreenChange(fn: () => void): () => void {
  if (!isWeb) return () => {};
  document.addEventListener('fullscreenchange', fn);
  document.addEventListener('webkitfullscreenchange', fn);
  return () => {
    document.removeEventListener('fullscreenchange', fn);
    document.removeEventListener('webkitfullscreenchange', fn);
  };
}
