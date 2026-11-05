import { Canvas, Picture, Skia, createPicture, type SkCanvas } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useStage } from './stageContext';

/**
 * Skia で絵をかく場所（Java版の View の onDraw のかわり）。
 *   <DrawCanvas width={400} height={300} draw={(c) => { ... }} />
 * draw の中では、Java版の Canvas とほぼ同じように drawRect などが使える（座標は基準の単位）。
 * 画面に合わせて拡大しても、ぼやけないように細かくかく
 */
type Props = {
  width: number;
  height: number;
  draw: (canvas: SkCanvas) => void;
  style?: StyleProp<ViewStyle>;
  /** これが変わったときだけ、かき直す（なければ毎回かき直す） */
  deps?: unknown[];
};

export function DrawCanvas({ width, height, draw, style, deps }: Props) {
  const { scale } = useStage();
  // 画面に拡大されるぶん（1より大きいとき）だけ、細かくかいて縮める
  const k = Math.max(1, Math.min(3, scale));
  const w = Math.max(1, Math.round(width * k));
  const h = Math.max(1, Math.round(height * k));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const picture = useMemo(
    () =>
      createPicture((c) => {
        c.scale(k, k);
        draw(c);
      }, Skia.XYWHRect(0, 0, w, h)),
    deps ? [k, w, h, ...deps] : [k, w, h, draw],
  );
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]} pointerEvents="none">
      {/* 縮めるのは外がわの View で（Canvas に直接つけると、Web では縮まない） */}
      <View style={{ width: w, height: h, transformOrigin: 'left top', transform: [{ scale: 1 / k }] }}>
        <Canvas style={{ width: w, height: h }}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </View>
  );
}
