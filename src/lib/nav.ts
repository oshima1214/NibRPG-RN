import { router } from 'expo-router';

/**
 * 前の画面にもどる。もどる画面がないとき（Web でページを直接開いたときなど）は、マップへ
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/map');
}
