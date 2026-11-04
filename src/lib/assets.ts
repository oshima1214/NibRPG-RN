import { Skia, type SkFont, type SkImage, type SkTypeface } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { IMG, type ImageName } from '@/data/images';

/**
 * Skia（マップ・よけゲームなどの絵をかく部品）で使う画像と文字を、はじめにまとめて読みこむ係。
 * 読みこみ終わるまでは、_layout.tsx が起動画面を出しておく
 */

const images = new Map<ImageName, SkImage>();
let dotFace: SkTypeface | null = null;
const fonts = new Map<number, SkFont>();

async function dataOf(mod: number) {
  const a = Asset.fromModule(mod);
  if (Platform.OS !== 'web') await a.downloadAsync();
  return Skia.Data.fromURI(a.localUri ?? a.uri);
}

let loading: Promise<void> | null = null;

/** 画像と文字を全部読みこむ（何回呼んでもよい） */
export function loadGameAssets(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      await Promise.all(
        (Object.keys(IMG) as ImageName[]).map(async (name) => {
          try {
            const img = Skia.Image.MakeImageFromEncoded(await dataOf(IMG[name]));
            if (img) images.set(name, img);
          } catch {
            // 読めなかった画像は、かかないだけ
          }
        }),
      );
      try {
        dotFace = Skia.Typeface.MakeFreeTypeFaceFromData(
          await dataOf(require('../../assets/fonts/DotGothic16-Regular.ttf')),
        );
      } catch {
        dotFace = null;
      }
    })();
  }
  return loading;
}

/** 読みこんだ画像（Skia 用） */
export function skImage(name: ImageName): SkImage | null {
  return images.get(name) ?? null;
}

/** ドットの文字（Skia 用）。size は文字の大きさ */
export function dotFont(size: number): SkFont {
  let f = fonts.get(size);
  if (!f) {
    f = dotFace ? Skia.Font(dotFace, size) : Skia.Font(undefined, size);
    fonts.set(size, f);
  }
  return f;
}
