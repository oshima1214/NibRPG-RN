import { createContext, useContext } from 'react';

import { BASE_HEIGHT, BASE_WIDTH } from '@/constants/game';

/** 今の舞台の大きさ（基準の単位）と、よけるべき場所（切り欠きなど） */
export type Stage = {
  width: number; // 舞台の横幅（1280 以上）
  height: number; // 舞台の高さ（720 以上）
  safe: { top: number; right: number; bottom: number; left: number };
  scale: number; // 基準の1が、実際の画面で何ポイントか（絵をくっきりかくために使う）
};

export const StageContext = createContext<Stage>({
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  safe: { top: 0, right: 0, bottom: 0, left: 0 },
  scale: 1,
});

/**
 * 舞台の大きさを知りたいときに使う。
 *   const { width, height, safe } = useStage();
 * ボタンなどを画面のはしに置くときは、safe のぶんだけ内がわにずらす
 */
export const useStage = () => useContext(StageContext);
