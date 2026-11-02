import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { BgmName } from '@/data/sounds';

import { bgm, pauseBgmSoon } from './sound';

/**
 * この画面を開いている間、BGMを流す。画面を離れたら、少し待って止める
 * （次の画面が同じ曲なら、止めずにそのまま続く）。
 *   useBgm('bgm_map');
 */
export function useBgm(name: BgmName | null) {
  useFocusEffect(
    useCallback(() => {
      if (name) bgm(name);
      return () => pauseBgmSoon();
    }, [name]),
  );
}
