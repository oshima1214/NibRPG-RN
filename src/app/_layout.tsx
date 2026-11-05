import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { COLORS, FONT } from '@/constants/game';
import { loadGameAssets } from '@/lib/assets';
import { initSound } from '@/lib/sound';
import { useStoresReady } from '@/state/ready';

// 文字・画像・セーブデータを読みこみ終わるまで、起動画面（スプラッシュ）を出しておく
SplashScreen.preventAutoHideAsync();

// 効果音を読みこみはじめる
initSound();

/** すべての画面の土台：文字の読みこみ・上下のバーをかくす・横画面・画面の切りかえ方 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    [FONT.dot]: require('../../assets/fonts/DotGothic16-Regular.ttf'),
  });
  const [assets, setAssets] = useState(false);
  const stores = useStoresReady();
  useEffect(() => {
    loadGameAssets().finally(() => setAssets(true));
  }, []);

  const ready = (loaded || !!error) && assets && stores;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false, // 上の見出しは出さない（ゲームなので）
          orientation: 'landscape', // 横画面（スマホのアプリのとき）
          navigationBarHidden: true, // Android の下の「戻る・ホーム」ボタンをかくす（画面のはしをスワイプすると一時的に出る）
          autoHideHomeIndicator: true, // iPhone の下の白い線を、しばらくさわらないと消えるようにする
          gestureEnabled: false, // 画面のはしをスワイプしても、前の画面にもどらない（戦闘中などにもどらないように）
          animation: 'fade',
          contentStyle: { backgroundColor: COLORS.black },
        }}
      />
    </>
  );
}
