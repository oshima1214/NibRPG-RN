import { useEffect, useState } from 'react';

/**
 * Web で、カメラの切り欠きなどの「よけるべき場所」を調べる係。
 * ブラウザが教えてくれる env(safe-area-inset-*) を、見えない箱のすき間として読みとる。
 * 画面の向きが変わったときなどにも、読み直す（iPhone で横にしたときに、少しおくれて値が変わるため）
 */
export type Insets = { top: number; right: number; bottom: number; left: number };

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
let probe: HTMLDivElement | null = null;

function read(): Insets {
  if (typeof document === 'undefined') return ZERO;
  if (!probe) {
    probe = document.createElement('div');
    const s = probe.style;
    s.position = 'fixed';
    s.left = '0';
    s.top = '0';
    s.width = '0';
    s.height = '0';
    s.visibility = 'hidden';
    s.pointerEvents = 'none';
    s.paddingTop = 'env(safe-area-inset-top)';
    s.paddingRight = 'env(safe-area-inset-right)';
    s.paddingBottom = 'env(safe-area-inset-bottom)';
    s.paddingLeft = 'env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const c = window.getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  return { top: px(c.paddingTop), right: px(c.paddingRight), bottom: px(c.paddingBottom), left: px(c.paddingLeft) };
}

const same = (a: Insets, b: Insets) => a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

export function useWebSafeInsets(): Insets {
  const [insets, setInsets] = useState<Insets>(read);
  useEffect(() => {
    const update = () => setInsets((old) => {
      const n = read();
      return same(old, n) ? old : n;
    });
    // 向きが変わったあと、値が落ち着くまで何回か読み直す
    const later = () => {
      update();
      setTimeout(update, 100);
      setTimeout(update, 500);
    };
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
    later();
    return () => {
      window.removeEventListener('resize', later);
      window.removeEventListener('orientationchange', later);
    };
  }, []);
  return insets;
}
