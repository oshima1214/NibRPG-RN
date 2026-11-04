import type { StyleProp, ViewStyle } from 'react-native';

import { SPRITE_H, SPRITE_W, drawHero } from '@/lib/sprite';
import type { Look } from '@/state/character';

import { DrawCanvas } from './DrawCanvas';

/**
 * 主人公の見本（キャラクリ・メニューで使う）。わくの中に、まん中にそろえて大きくかく
 *   margin：まわりにあけるドットの数（Java版のキャラクリは 4 → 横22・縦52 が入る大きさ）
 */
export function HeroView({
  look,
  width,
  height,
  direction = 0,
  frame = 0,
  margin = 4,
  style,
}: {
  look: Look;
  width: number;
  height: number;
  direction?: number;
  frame?: number;
  margin?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <DrawCanvas
      width={width}
      height={height}
      style={style}
      deps={[look, width, height, direction, frame, margin]}
      draw={(c) => {
        const scale = Math.min(width / (SPRITE_W + margin), height / (SPRITE_H + margin));
        if (scale <= 0) return;
        const x = (width - SPRITE_W * scale) / 2;
        const y = (height - SPRITE_H * scale) / 2;
        drawHero(c, look, x, y, scale, direction, frame);
      }}
    />
  );
}
