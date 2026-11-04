import { LOOK_ALIKES } from '@/data/battle';

/** 0 〜 n-1 のどれか */
export const rand = (n: number) => Math.floor(Math.random() * n);

/** 配列の順番をバラバラにする（その配列を書きかえて返す） */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** その文字の「見まちがえやすいなかま」（なければその文字だけ） */
export function lookAlikes(c: string) {
  return LOOK_ALIKES.find((g) => g.includes(c)) ?? c;
}
