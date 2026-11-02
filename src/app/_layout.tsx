import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { COLORS, FONT } from '@/constants/game';
import { initSound } from '@/lib/sound';
import { setupWebPage } from '@/lib/web';

// 文字を読みこみ終わるまで、起動画面（スプラッシュ）を出しておく
SplashScreen.preventAutoHideAsync();

// Web のページをゲーム向けにする・効果音を読みこみはじめる
setupWebPage();
initSound();

/** すべての画面の土台：文字の読みこみ・上下のバーをかくす・横画面・画面の切りかえ方 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    [FONT.dot]: require('../../assets/fonts/DotGothic16-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false, // 上の見出しは出さない（ゲームなので）
          orientation: 'landscape', // 横画面（スマホのアプリのとき）
          navigationBarHidden: true, // Android の下の「戻る・ホーム」ボタンをかくす（画面のはしをスワイプすると一時的に出る）
          autoHideHomeIndicator: true, // iPhone の下の白い線を、しばらくさわらないと消えるようにする
          animation: 'fade',
          contentStyle: { backgroundColor: COLORS.black },
        }}
      />
    </>
  );
}
