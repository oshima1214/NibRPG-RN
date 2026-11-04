// アプリの入口（Web 用）。
// マップやよけゲームの絵をかく部品（Skia）は、Web では先に読みこんでおく必要がある（canvaskit.wasm）。
// 読みこみ終わってから、ゲームを始める
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
  require('expo-router/entry');
});
