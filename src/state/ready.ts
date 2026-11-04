import { useEffect, useState } from 'react';

import { useAchievements } from './achievements';
import { useLook } from './character';
import { useGame } from './game';

/**
 * セーブデータ（ゲーム・実績・見た目）を読みこみ終わったか。
 * 読みこむ前にタイトルを出すと「つづきから」が出ないので、終わるまで待つ
 */
const stores = [useGame.persist, useAchievements.persist, useLook.persist];
const allDone = () => stores.every((p) => p.hasHydrated());

export function useStoresReady(): boolean {
  const [ready, setReady] = useState(allDone);
  useEffect(() => {
    if (ready) return;
    const offs = stores.map((p) => p.onFinishHydration(() => setReady(allDone())));
    setReady(allDone());
    return () => offs.forEach((off) => off());
  }, [ready]);
  return ready;
}
