/**
 * 音のファイルの一覧（assets/sounds）。Java版の res/raw の ogg を m4a に変えたもの
 * （iPhone でも Web でも鳴るように）。音を増やしたら、ここにも1行足す
 */
export const SOUNDS = {
  bgm_boss: require('../../assets/sounds/bgm_boss.m4a'),
  bgm_boss2: require('../../assets/sounds/bgm_boss2.m4a'),
  bgm_ending: require('../../assets/sounds/bgm_ending.m4a'),
  bgm_floor2: require('../../assets/sounds/bgm_floor2.m4a'),
  bgm_floor3: require('../../assets/sounds/bgm_floor3.m4a'),
  bgm_floor4: require('../../assets/sounds/bgm_floor4.m4a'),
  bgm_map: require('../../assets/sounds/bgm_map.m4a'),
  bgm_principal: require('../../assets/sounds/bgm_principal.m4a'),
  bgm_principal2: require('../../assets/sounds/bgm_principal2.m4a'),
  bgm_rijicho_room: require('../../assets/sounds/bgm_rijicho_room.m4a'),
  bgm_shop: require('../../assets/sounds/bgm_shop.m4a'),
  bgm_title: require('../../assets/sounds/bgm_title.m4a'),
  jg_clear: require('../../assets/sounds/jg_clear.m4a'),
  jg_key: require('../../assets/sounds/jg_key.m4a'),
  jg_lose: require('../../assets/sounds/jg_lose.m4a'),
  jg_win: require('../../assets/sounds/jg_win.m4a'),
  se_achievement: require('../../assets/sounds/se_achievement.m4a'),
  se_battle_start: require('../../assets/sounds/se_battle_start.m4a'),
  se_board_erase: require('../../assets/sounds/se_board_erase.m4a'),
  se_buy: require('../../assets/sounds/se_buy.m4a'),
  se_cancel: require('../../assets/sounds/se_cancel.m4a'),
  se_chalk_wall: require('../../assets/sounds/se_chalk_wall.m4a'),
  se_chalk_write: require('../../assets/sounds/se_chalk_write.m4a'),
  se_chime: require('../../assets/sounds/se_chime.m4a'),
  se_clock_warn: require('../../assets/sounds/se_clock_warn.m4a'),
  se_confiscate: require('../../assets/sounds/se_confiscate.m4a'),
  se_correct: require('../../assets/sounds/se_correct.m4a'),
  se_critical: require('../../assets/sounds/se_critical.m4a'),
  se_damage: require('../../assets/sounds/se_damage.m4a'),
  se_door: require('../../assets/sounds/se_door.m4a'),
  se_equip: require('../../assets/sounds/se_equip.m4a'),
  se_heal: require('../../assets/sounds/se_heal.m4a'),
  se_hit_teacher: require('../../assets/sounds/se_hit_teacher.m4a'),
  se_key: require('../../assets/sounds/se_key.m4a'),
  se_locked: require('../../assets/sounds/se_locked.m4a'),
  se_menu_close: require('../../assets/sounds/se_menu_close.m4a'),
  se_menu_open: require('../../assets/sounds/se_menu_open.m4a'),
  se_mouse: require('../../assets/sounds/se_mouse.m4a'),
  se_no_money: require('../../assets/sounds/se_no_money.m4a'),
  se_ok: require('../../assets/sounds/se_ok.m4a'),
  se_paper: require('../../assets/sounds/se_paper.m4a'),
  se_pause: require('../../assets/sounds/se_pause.m4a'),
  se_pc_impact: require('../../assets/sounds/se_pc_impact.m4a'),
  se_pen_lock: require('../../assets/sounds/se_pen_lock.m4a'),
  se_phase2: require('../../assets/sounds/se_phase2.m4a'),
  se_pickup: require('../../assets/sounds/se_pickup.m4a'),
  se_retire: require('../../assets/sounds/se_retire.m4a'),
  se_ring: require('../../assets/sounds/se_ring.m4a'),
  se_shrink: require('../../assets/sounds/se_shrink.m4a'),
  se_stage_next: require('../../assets/sounds/se_stage_next.m4a'),
  se_stairs: require('../../assets/sounds/se_stairs.m4a'),
  se_stamp: require('../../assets/sounds/se_stamp.m4a'),
  se_stamp_warn: require('../../assets/sounds/se_stamp_warn.m4a'),
  se_step: require('../../assets/sounds/se_step.m4a'),
  se_text: require('../../assets/sounds/se_text.m4a'),
  se_tile_place: require('../../assets/sounds/se_tile_place.m4a'),
  se_tile_remove: require('../../assets/sounds/se_tile_remove.m4a'),
  se_vending_drop: require('../../assets/sounds/se_vending_drop.m4a'),
  se_wrong: require('../../assets/sounds/se_wrong.m4a'),
} as const;

export type SoundName = keyof typeof SOUNDS;
export type BgmName = Extract<SoundName, `bgm_${string}`>; // BGM（くり返す曲）
export type JingleName = Extract<SoundName, `jg_${string}`>; // ジングル（1回だけの短い曲）
export type SeName = Extract<SoundName, `se_${string}`>; // 効果音

// 音の大きさ（0〜1）
export const BGM_VOLUME = 0.45;
export const JINGLE_VOLUME = 0.6;
export const SE_VOLUME = 0.8;

/** 戦闘のBGMは、ほかの曲の何倍の大きさで流すか（BGM_VOLUME × この数。1 をこえる分は 1 になる） */
export const BATTLE_BGM_RATE = 1.9;
const BATTLE_BGM: readonly BgmName[] = [
  'bgm_floor2', 'bgm_floor3', 'bgm_floor4', 'bgm_principal', 'bgm_principal2', 'bgm_boss', 'bgm_boss2',
];

/** この曲を流すときの音の大きさ */
export function bgmVolume(name: BgmName): number {
  return BATTLE_BGM.includes(name) ? Math.min(1, BGM_VOLUME * BATTLE_BGM_RATE) : BGM_VOLUME;
}

/** 効果音の一覧（はじめにまとめて読みこむ） */
export const SE_NAMES = Object.keys(SOUNDS).filter((n): n is SeName => n.startsWith('se_'));

/** 短い間に何回も重ねて鳴らす効果音（同時に鳴らせる数を多めにする） */
export const SE_MANY: Partial<Record<SeName, number>> = { se_text: 3, se_step: 2, se_tile_place: 2, se_hit_teacher: 2, se_damage: 2 };
