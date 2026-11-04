/**
 * ゲーム全体で使う数字と色。
 * 画面は「横1280・縦720」を基準に作って、実際の画面の大きさに合わせて拡大・縮小する（GameStage）。
 * 横長の端末では横が、太い端末（タブレット）では縦が伸びる。真ん中の 1280×720 は必ず見える。
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
  titleBg: '#0D1B4C', // タイトル：夜空の青
  clearBg: '#5A2A0C', // クリア：夕焼けの茶色
  overBg: '#111111', // 失敗：ほぼ黒
  over1Bg: '#2E1430', // 失敗・1人目・2F：深い紫
  over2Bg: '#1F2E14', // 失敗・2人目・3F：深緑
  over3Bg: '#102438', // 失敗・3人目・4F：深い青
  over4Bg: '#111111', // 失敗・校長：ほぼ黒
  over5Bg: '#2A0E0E', // 失敗・理事長：深い赤黒
  battleBg: '#1B1030', // 戦闘の背景：深い紫紺
  battleHpGreen: '#66BB6A', // 自分のHPバー
  nibNavy: '#0F3193', // 学校ロゴの紺
  nibCyan: '#34B3D3', // 学校ロゴの水色
  nibRed: '#FE0000', // 学校ロゴの赤
  rpgYellow: '#FFD54F',
  rpgRed: '#FF5252',
  rpgGray: '#AAAAAA',
  shopWeaponBg: '#3B2414', // 武器屋：こげ茶
  shopItemBg: '#143B24', // 道具屋：深緑
  vendingRoom: '#0B1A33', // 自販機のまわりの暗い背景
  vendingLedGreen: '#39FF6A', // 光る緑の文字
  officeWall: '#EFE6D2', // 事務室のかべ
  counterTop: '#F2F0EA', // カウンターの台
  counterFront: '#AEB7BD', // カウンターの前板
  formRed: '#D32F2F', // 申込書の赤
} as const;
