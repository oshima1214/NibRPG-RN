import { Platform } from 'react-native';

/**
 * Web で遊ぶときのための準備（スマホのアプリでは何もしない）。
 *   ・ページをゲーム向けにする（画面いっぱい・ズームやスクロールをしない・長押しで文字を選ばない）
 *   ・「ホーム画面に追加」したときに、アプリのように全画面で開くようにする（iPhone 向け）
 */

const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';

function addTag(tag: 'meta' | 'link', attrs: Record<string, string>) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

let done = false;

/** アプリを開いたときに1回呼ぶ */
export function setupWebPage() {
  if (!isWeb || done) return;
  done = true;

  // 画面いっぱい（カメラの切り欠きの下まで）に広げる。ピンチでズームしない
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    document.head.appendChild(viewport);
  }
  viewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  );

  // 「ホーム画面に追加」したときに、アプリのように開く
  addTag('link', { rel: 'manifest', href: '/manifest.json' });
  addTag('link', { rel: 'apple-touch-icon', href: '/icon.png' });
  addTag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  addTag('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  addTag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  addTag('meta', { name: 'apple-mobile-web-app-title', content: 'Nib RPG' });

  // スクロール・ズーム・長押しの文字選択やメニューを止める
  const style = document.createElement('style');
  style.textContent = `
    html, body { background: #000; overscroll-behavior: none; touch-action: none;
      -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(style);
}

/** 全画面にする（タップしたときに呼ぶ。iPhone の Safari ではできないので、何もしない） */
export function enterFullscreen() {
  if (!isWeb || document.fullscreenElement) return;
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      // 全画面にできたら、横向きに固定する（Android の Chrome など）
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      return o.lock?.('landscape');
    })
    .catch(() => {});
}
