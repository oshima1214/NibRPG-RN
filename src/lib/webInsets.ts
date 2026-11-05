/**
 * Web で、カメラの切り欠きなどの「よけるべき場所」を調べる係（スマホのアプリ用はこちら：何もしない）。
 * Web 用は webInsets.web.ts
 */
export type Insets = { top: number; right: number; bottom: number; left: number };

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function useWebSafeInsets(): Insets {
  return ZERO;
}
