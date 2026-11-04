import type { GestureResponderEvent } from 'react-native';

/**
 * タッチした場所を、ゲームの舞台の座標（基準の単位）にする。
 * 舞台は画面の左上（0, 0）から始まって、scale 倍で表示されているので、
 * 画面上の位置 ÷ scale が舞台の座標になる（スマホでも Web でも同じ）
 */
export function stagePoint(e: GestureResponderEvent, scale: number) {
  return { x: e.nativeEvent.pageX / scale, y: e.nativeEvent.pageY / scale };
}
