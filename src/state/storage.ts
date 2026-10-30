import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * セーブの保存先。スマホでは端末の中、Webではブラウザ（localStorage）に保存される
 */
export const storage = createJSONStorage(() => AsyncStorage);

/**
 * 保存してあった配列を、今の長さに合わせる（Java版の splitTo と同じ考え）。
 * 階や品物の数を変えても、入るぶんだけ読みこむので、エラーにならない
 */
export function fit<T>(saved: unknown, fallback: readonly T[]): T[] {
  const out = [...fallback];
  if (!Array.isArray(saved)) return out;
  for (let i = 0; i < out.length && i < saved.length; i++) {
    if (typeof saved[i] === typeof fallback[i]) out[i] = saved[i];
  }
  return out;
}

/** 数字を min〜max の間におさめる */
export function clamp(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
}
