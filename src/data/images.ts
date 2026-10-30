/**
 * ゲームで使う絵（assets/images/game の中）。名前で取り出す：IMG.s_m_sensei など
 * 絵を足したときは、ここにも1行足す。
 */

export const IMG = {
  boss_rijicho: require('../../assets/images/game/boss_rijicho.png'),
  dodge_chalk: require('../../assets/images/game/dodge_chalk.png'),
  dodge_heart: require('../../assets/images/game/dodge_heart.png'),
  dodge_mouse: require('../../assets/images/game/dodge_mouse.png'),
  dodge_pc: require('../../assets/images/game/dodge_pc.png'),
  dodge_pen: require('../../assets/images/game/dodge_pen.png'),
  e_sensei: require('../../assets/images/game/e_sensei.png'),
  floor_blue: require('../../assets/images/game/floor_blue.png'),
  item_bar: require('../../assets/images/game/item_bar.png'),
  item_bread: require('../../assets/images/game/item_bread.png'),
  item_coffee: require('../../assets/images/game/item_coffee.png'),
  item_energy: require('../../assets/images/game/item_energy.png'),
  koutyou_sensei: require('../../assets/images/game/koutyou_sensei.png'),
  lost_badge: require('../../assets/images/game/lost_badge.png'),
  lost_card: require('../../assets/images/game/lost_card.png'),
  lost_eraser: require('../../assets/images/game/lost_eraser.png'),
  lost_pencil: require('../../assets/images/game/lost_pencil.png'),
  lost_usb: require('../../assets/images/game/lost_usb.png'),
  obj_bench: require('../../assets/images/game/obj_bench.png'),
  obj_bookshelf: require('../../assets/images/game/obj_bookshelf.png'),
  obj_clerk: require('../../assets/images/game/obj_clerk.png'),
  obj_desk_laptop: require('../../assets/images/game/obj_desk_laptop.png'),
  obj_desk_oc: require('../../assets/images/game/obj_desk_oc.png'),
  obj_desk_pc: require('../../assets/images/game/obj_desk_pc.png'),
  obj_info_counter: require('../../assets/images/game/obj_info_counter.png'),
  obj_info_counter_front: require('../../assets/images/game/obj_info_counter_front.png'),
  obj_low_table: require('../../assets/images/game/obj_low_table.png'),
  obj_notice_board: require('../../assets/images/game/obj_notice_board.png'),
  obj_plant_table: require('../../assets/images/game/obj_plant_table.png'),
  obj_principal_desk: require('../../assets/images/game/obj_principal_desk.png'),
  obj_sofa: require('../../assets/images/game/obj_sofa.png'),
  obj_stairs_door: require('../../assets/images/game/obj_stairs_door.png'),
  obj_trash: require('../../assets/images/game/obj_trash.png'),
  obj_vending_blue: require('../../assets/images/game/obj_vending_blue.png'),
  obj_vending_blue_sideways: require('../../assets/images/game/obj_vending_blue_sideways.png'),
  obj_vending_red: require('../../assets/images/game/obj_vending_red.png'),
  obj_whiteboard: require('../../assets/images/game/obj_whiteboard.png'),
  s_m_sensei: require('../../assets/images/game/s_m_sensei.png'),
  s_s_sensei: require('../../assets/images/game/s_s_sensei.png'),
} as const;

/** 絵の名前（IMG のキー） */
export type ImageName = keyof typeof IMG;
