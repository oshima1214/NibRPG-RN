import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { COLORS, FONT } from '@/constants/game';

// 文字を読みこみ終わるまで、起動画面（スプラッシュ）を出しておく
SplashScreen.preventAutoHideAsync();

/** すべての画面の土台：文字の読みこみ・ステータスバーをかくす・横画面・画面の切りかえ方 */
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
          animation: 'fade',
          contentStyle: { backgroundColor: COLORS.black },
        }}
      />
    </>
  );
}
