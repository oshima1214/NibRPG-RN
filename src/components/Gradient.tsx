import { Skia, TileMode } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { DrawCanvas } from './DrawCanvas';

/**
 * グラデーション（色がだんだん変わる）の背景。Java版の drawable の gradient のかわり。
 *   <Gradient colors={['#FFFFFF', '#000000']} dir="down" style={...} />
 *   dir：right（左→右）・down（上→下）・radial（まん中から外へ）
 * 中身（children）は、グラデーションの上に重ねて置く
 */
export function Gradient({
  colors,
  stops,
  dir = 'right',
  style,
  radius = 0,
  children,
}: {
  colors: string[];
  stops?: number[];
  dir?: 'right' | 'down' | 'radial';
  style?: StyleProp<ViewStyle>;
  radius?: number;
  children?: React.ReactNode;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={[{ overflow: 'hidden', borderRadius: radius }, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && size.h > 0 && (
        <DrawCanvas
          width={size.w}
          height={size.h}
          style={{ position: 'absolute', left: 0, top: 0 }}
          deps={[size.w, size.h, colors.join(','), stops?.join(','), dir]}
          draw={(c) => {
            const p = Skia.Paint();
            const cols = colors.map((col) => Skia.Color(col));
            const shader =
              dir === 'radial'
                ? Skia.Shader.MakeRadialGradient(
                    { x: size.w / 2, y: size.h / 2 },
                    Math.min(size.w, size.h) / 2,
                    cols,
                    stops ?? null,
                    TileMode.Clamp,
                  )
                : Skia.Shader.MakeLinearGradient(
                    { x: 0, y: 0 },
                    dir === 'right' ? { x: size.w, y: 0 } : { x: 0, y: size.h },
                    cols,
                    stops ?? null,
                    TileMode.Clamp,
                  );
            p.setShader(shader);
            c.drawRect(Skia.XYWHRect(0, 0, size.w, size.h), p);
          }}
        />
      )}
      {children}
    </View>
  );
}
