/**
 * ゲーム全体で使う数字と色。
 * 画面は「横1280・縦720」を基準に作って、実際の画面の大きさに合わせて拡大・縮小する（GameStage）。
 * Java版の dp の数字は、だいたい「× 2」すると、この基準の数字になる。
 */

// 基準の画面の大きさ
export const BASE_WIDTH = 1280;
export const BASE_HEIGHT = 720;

// 文字の種類（_layout.tsx で読みこむ名前）
export const FONT = {
  dot: 'DotGothic16', // ドットの文字
} as const;

// 色（Java版の colors.xml と同じ）
export const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  titleBg: '#0D1B4C', // 夜空の青
  battleBg: '#1B1030', // 戦闘の背景：深い紫紺
  nibNavy: '#0F3193', // 学校ロゴの紺
  nibCyan: '#34B3D3', // 学校ロゴの水色
  nibRed: '#FE0000', // 学校ロゴの赤
  rpgYellow: '#FFD54F',
  rpgRed: '#FF5252',
  rpgGray: '#AAAAAA',
} as const;
