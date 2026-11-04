import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { DrawCanvas } from '@/components/DrawCanvas';
import { GameDialog } from '@/components/GameDialog';
import { GameStage, SafeArea } from '@/components/GameStage';
import { Txt, nibButtonStyle, windowStyle } from '@/components/ui';
import { COLORS } from '@/constants/game';
import { BOSS_HP, BOSS_SHRINK_HP, BOSS_STAGES, FLOOR_BATTLE, bossStageOf, type BattleKind } from '@/data/battle';
import { AFTER_TALKS, BOSS_FLOOR, BOSS_ROOM_RIGHT, FLOORS, LAST, LOST_ITEMS, NAMES, TEACHER_NAMES } from '@/data/map';
import { T, TA } from '@/data/texts';
import { fmt } from '@/lib/format';
import { drawMap } from '@/lib/mapDraw';
import { bgm, pauseBgmSoon, se } from '@/lib/sound';
import { BACK, FRONT, LEFT, RIGHT } from '@/lib/sprite';
import { ACH, CLERK_TALK_COUNT, useAchievements } from '@/state/achievements';
import { useLook } from '@/state/character';
import { DEBUG, useGame, type Dir } from '@/state/game';

/** ゲーム本編：マップを歩いて探索する画面（Java版の MainActivity） */
const FIRST_WAIT_MS = 300; // 押しっぱなしで歩き始めるまで
const STEP_MS = 180; // 押しっぱなしのときの1歩の間かく
const WALK_POSE_MS = 150; // 歩きのポーズを出しておく時間

// 倒した先生と話した回数（階ごと。話すたびに次のセリフになる）
const afterTalks = new Array<number>(FLOORS.length).fill(0);

type Choice = { label: string; action: (() => void) | null };
type Msg = { text: string; choices: Choice[] };

export default function MapScreen() {
  return (
    <GameStage background={COLORS.black}>
      <MapGame />
    </GameStage>
  );
}

/** 戦闘画面の場所 */
const BATTLE_ROUTE: Record<BattleKind, '/battle/words' | '/battle/fill' | '/battle/memory' | '/battle/dodge'> = {
  words: '/battle/words',
  fill: '/battle/fill',
  memory: '/battle/memory',
  dodge: '/battle/dodge',
};

/** 文字 c のマスを探して、そのとなりの床の位置を返す */
function nextTo(floor: number, c: string) {
  const map = FLOORS[floor];
  for (let y = 0; y < map.length; y++) {
    const x = map[y].indexOf(c);
    if (x >= 0) return inside(floor, x, y);
  }
  return { px: -1, py: -1 };
}

/** (x, y) のとなりにある床（.）の位置。となりに床がないときは、そのマス */
function inside(floor: number, x: number, y: number) {
  const map = FLOORS[floor];
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [-1, 0],
    [1, 0],
  ]) {
    const ax = x + dx;
    const ay = y + dy;
    if (ay < 0 || ay >= map.length || ax < 0 || ax >= map[ay].length) continue;
    if (map[ay][ax] === '.') return { px: ax, py: ay };
  }
  return { px: x, py: y };
}

/** 扉（! か L）のかたまりを探す。つながっている扉を1つのかたまりにする */
function findDoorGroups(map: readonly string[]) {
  const groups: [number, number][][] = [];
  const used = map.map((row) => new Array<boolean>(row.length).fill(false));
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const door = map[y][x];
      if ((door !== '!' && door !== 'L') || used[y][x]) continue;
      // 新しいかたまり：となりの同じ扉を全部集める
      const group: [number, number][] = [];
      const todo: [number, number][] = [[x, y]];
      used[y][x] = true;
      while (todo.length > 0) {
        const p = todo.pop()!;
        group.push(p);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const ax = p[0] + dx;
          const ay = p[1] + dy;
          if (ay < 0 || ay >= map.length || ax < 0 || ax >= map[ay].length) continue;
          if (map[ay][ax] === door && !used[ay][ax]) {
            used[ay][ax] = true;
            todo.push([ax, ay]);
          }
        }
      }
      // かたまりの中を、上→下、左→右の順に並べる
      group.sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]));
      groups.push(group);
    }
  }
  return groups;
}

function MapGame() {
  const g = useGame();
  const look = useLook();
  const [msg, setMsg] = useState<Msg | null>(null);
  const talking = useRef(false); // メッセージを出している間は歩けない
  const [debugBoss, setDebugBoss] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0); // 0=直立、1=左足、2=右足
  const nextWalkFrame = useRef(1);
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ===================== メッセージ =====================

  /** ボタンつきのメッセージ。ボタンを押すと action が動く（null なら閉じるだけ） */
  const showChoices = (text: string, choices: Choice[]) => {
    talking.current = true;
    setMsg({ text, choices });
  };
  /** 「とじる」だけのメッセージ */
  const showInfo = (text: string) => showChoices(text, [{ label: T.btn_close, action: null }]);

  // ===================== 歩く =====================

  /** 押しっぱなしで歩き続ける処理を止める（お店や戦闘の画面が何回も開かないように） */
  const stopWalking = () => {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
    if (walkTimer.current) clearTimeout(walkTimer.current);
    setWalkFrame(0);
  };

  /** 1マス移動に成功したときの歩きのポーズ（重田さん作） */
  const onPlayerStepped = () => {
    if (walkTimer.current) clearTimeout(walkTimer.current);
    setWalkFrame(nextWalkFrame.current);
    nextWalkFrame.current = nextWalkFrame.current === 1 ? 2 : 1;
    walkTimer.current = setTimeout(() => setWalkFrame(0), WALK_POSE_MS);
  };

  /** 場所に合わせてBGMを流す（理事長室の中は、不気味な曲） */
  const updateBgm = () => {
    const s = useGame.getState();
    const inRoom = s.floor === BOSS_FLOOR && s.px <= BOSS_ROOM_RIGHT;
    bgm(inRoom ? 'bgm_rijicho_room' : 'bgm_map');
  };

  /** 1歩動く。行き先のマスによって、することを変える */
  const move = (dx: number, dy: number) => {
    if (talking.current) return;
    const s = useGame.getState();
    // 押した方向を向く（壁などで進めなくても、向きは変わる）
    const dir: Dir = (dx < 0 ? LEFT : dx > 0 ? RIGHT : dy < 0 ? BACK : FRONT) as Dir;
    useGame.setState({ dir });
    const map = FLOORS[s.floor];
    const nx = s.px + dx;
    const ny = s.py + dy;
    if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[ny].length) return; // マップの外
    const c = map[ny][nx];
    switch (c) {
      case ' ':
      case '#':
      case 'K':
        return; // 何もない場所・壁・机は通れない
      case '%':
        stopWalking();
        showChoices(T.clerk_hello, [
          { label: T.btn_buy_items, action: () => router.push('/shop') },
          { label: T.btn_talk, action: talkToClerk },
          { label: T.btn_nothing, action: null },
        ]);
        return;
      case '$':
        stopWalking();
        showChoices(T.vending_ask, [
          { label: T.btn_yes, action: () => router.push('/vending') },
          { label: T.btn_no, action: null },
        ]);
        return;
      case 'T':
        stopWalking();
        if (!s.defeated[s.floor]) meetTeacher(); // まだ勝っていない：勝負するか聞く
        else talkToDefeatedTeacher(); // 勝ったあと：ひとこと話す
        return;
      case '/':
        stopWalking();
        useStairs(); // 階段：上か下かを選ぶ
        return;
      case '!':
        goThroughDoor(nx, ny);
        return;
      case 'L': // 理事長室の扉：鍵がないと開かない
        stopWalking();
        if (!s.bossKey) {
          se('se_locked');
          showInfo(T.boss_door_locked); // 鍵を持っていない
        } else if (!s.doorUnlocked) {
          useKey(nx, ny); // はじめて：鍵を使うか聞く
        } else {
          goThroughDoor(nx, ny); // もう開いている
        }
        return;
      case 'R': // 理事長
        stopWalking();
        showChoices(T.boss_talk, [
          { label: T.btn_yes, action: startBoss },
          { label: T.btn_no, action: null },
        ]);
        return;
    }
    useGame.setState({ px: nx, py: ny });
    onPlayerStepped(); // 移動できたときだけ歩行アニメーション
    se('se_step', 0.4);
    pickUpLost();
  };

  /** 落とし物のマスに来たら拾う */
  const pickUpLost = () => {
    const s = useGame.getState();
    LOST_ITEMS.forEach((l, i) => {
      if (s.foundLost[i] || l.floor !== s.floor || l.x !== s.px || l.y !== s.py) return;
      const found = [...s.foundLost];
      found[i] = true;
      useGame.setState({ foundLost: found });
      stopWalking();
      se('se_pickup');
      showInfo(fmt(T.lost_found, l.name, useGame.getState().foundCount(), LOST_ITEMS.length));
    });
  };

  // ===================== 十字ボタン・キーボード =====================

  /** ボタンを押したら1歩。押しっぱなしなら歩き続ける */
  const padDown = (dx: number, dy: number) => {
    if (repeat.current) clearTimeout(repeat.current);
    move(dx, dy);
    const loop = () => {
      move(dx, dy);
      repeat.current = setTimeout(loop, STEP_MS);
    };
    repeat.current = setTimeout(loop, FIRST_WAIT_MS);
  };
  const padUp = () => {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  };

  // Web では、キーボードの矢印キー（WASD）でも歩ける
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const keys: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const onKey = (e: KeyboardEvent) => {
      const k = keys[e.key];
      if (!k) return;
      e.preventDefault();
      moveRef.current(k[0], k[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ===================== 階段 =====================

  /**
   * 階段：何階へ行くかを選ぶ。
   *   行ったことのある階（今いる階はのぞく）を全部ならべる
   *   1つ上の階にまだ行ったことがなければ「上の階へ」を出す（何階かは見せない）
   */
  const useStairs = () => {
    const s = useGame.getState();
    const f = s.floor;
    const choices: Choice[] = [];
    FLOORS.forEach((_, i) => {
      if (i === f || !s.visited[i]) return;
      choices.push({ label: fmt(T.floor_short, i + 1), action: () => goToFloor(i) });
    });
    if (f < LAST && !s.visited[f + 1]) choices.push({ label: T.btn_up, action: goUp });
    choices.push({ label: T.btn_cancel, action: null });
    showChoices(T.stairs_msg, choices);
  };

  /** まだ行ったことのない上の階へ。その階に先生がいるときは、勝っていないと行けない */
  const goUp = () => {
    const s = useGame.getState();
    const f = s.floor;
    if (!TEACHER_NAMES[f] || s.defeated[f]) goToFloor(f + 1);
    else showInfo(fmt(T.stairs_locked, TEACHER_NAMES[f]));
  };

  /** 指定した階へ移動して、階段のとなりに立つ */
  const goToFloor = (target: number) => {
    const visited = [...useGame.getState().visited];
    visited[target] = true;
    useGame.setState({ floor: target, visited, ...nextTo(target, '/') });
    se('se_stairs');
    updateBgm();
  };

  // ===================== 扉 =====================

  /**
   * 扉に入ったら、ペアになっている扉の内側に出る。
   * 扉のかたまりを上から順に数えて、1つ目と2つ目、3つ目と4つ目…がペア。
   */
  const goThroughDoor = (x: number, y: number) => {
    const f = useGame.getState().floor;
    const groups = findDoorGroups(FLOORS[f]);
    for (let gi = 0; gi < groups.length; gi++) {
      const i = groups[gi].findIndex(([dx, dy]) => dx === x && dy === y);
      if (i < 0) continue;
      const pair = gi % 2 === 0 ? gi + 1 : gi - 1;
      if (pair >= groups.length) return; // ペアがない扉は開かない
      const other = groups[pair];
      const door = other[Math.min(i, other.length - 1)];
      useGame.setState(inside(f, door[0], door[1]));
      se('se_door');
      updateBgm(); // 理事長室に入った・出たときは曲を変える
      return;
    }
  };

  /** 理事長室の扉：はじめてさわったとき「鍵を使いますか？」と聞く。「はい」で開けて中に入る */
  const useKey = (x: number, y: number) => {
    showChoices(T.boss_use_key, [
      {
        label: T.btn_yes,
        action: () => {
          useGame.setState({ doorUnlocked: true }); // 一度開けたら、次からはそのまま通れる
          se('se_key');
          goThroughDoor(x, y);
        },
      },
      { label: T.btn_no, action: null },
    ]);
  };

  // ===================== 先生・事務員さん =====================

  /** 先生にふれたとき：先生のセリフを出して、戦うかどうかを聞く */
  const meetTeacher = () => {
    const f = useGame.getState().floor;
    showChoices(fmt(T.teacher_talk, TEACHER_NAMES[f], TA.teacher_greet[f]), [
      { label: T.btn_yes, action: startBattle },
      { label: T.btn_no, action: null }, // 「いいえ」なら何もしない
    ]);
  };

  /** 戦う：その階の戦闘画面へ（マップの画面は閉じないので、勝ったら続きから） */
  const startBattle = () => {
    const kind = FLOOR_BATTLE[useGame.getState().floor];
    if (kind) router.push(BATTLE_ROUTE[kind]);
  };

  /** 倒した先生に話しかけたとき：勝ったあとのセリフ（話すたびに変わる） */
  const talkToDefeatedTeacher = () => {
    const f = useGame.getState().floor;
    const lines = AFTER_TALKS[f];
    showInfo(fmt(T.teacher_after, TEACHER_NAMES[f], lines[afterTalks[f] % lines.length]));
    afterTalks[f]++;
  };

  /** 事務員さんの話を聞く（聞くたびに話が変わる。10回で実績） */
  const talkToClerk = () => {
    const n = useGame.getState().clerkTalks;
    showInfo(TA.clerk_talks[n % TA.clerk_talks.length]);
    useGame.setState({ clerkTalks: n + 1 });
    if (n + 1 >= CLERK_TALK_COUNT) useAchievements.getState().unlock(ACH.CLERK_REGULAR);
  };

  // ===================== 理事長 =====================

  /** 理事長戦を始める（ふつうは1問目から、HPは満タン。デバッグ中は、HPを選んでから） */
  const startBoss = () => {
    if (DEBUG) setDebugBoss(true);
    else startBossFrom(BOSS_HP);
  };

  /** 理事長のHPを hp にして、その問題から始める */
  const startBossFrom = (hp: number) => {
    useGame.setState({ bossHp: hp });
    const stage = bossStageOf(hp);
    router.push({ pathname: BATTLE_ROUTE[BOSS_STAGES[stage]], params: { boss: '1', stage: String(stage) } });
  };

  const quarter = BOSS_HP / BOSS_STAGES.length;
  const debugHps = [BOSS_HP, quarter * 3, quarter * 2, quarter, BOSS_SHRINK_HP];

  // ===================== 画面を開いたとき =====================

  useEffect(() => {
    const s = useGame.getState();
    // はじめて来たときは、1FのPの位置からスタート
    if (s.px < 0) {
      const map = FLOORS[s.floor];
      let pos = { px: -1, py: -1 };
      map.forEach((row, y) => {
        const x = row.indexOf('P');
        if (x >= 0) pos = { px: x, py: y };
      });
      // Pがない階（デバッグで2F〜5Fから始めたとき）は、階段のとなりから
      if (pos.px < 0) pos = nextTo(s.floor, '/');
      useGame.setState(pos);
    }
    // ゲームを始めて、はじめて来たときだけ、遊び方の説明を出す
    if (!s.tutorialDone) {
      useGame.setState({ tutorialDone: true });
      showTutorial(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 遊び方の説明を1ページ出す。「次へ」で次のページ、最後は「はじめる」で閉じる */
  const showTutorial = (page: number) => {
    const pages = TA.tutorial_pages;
    const last = page === pages.length - 1;
    showChoices(pages[page], [{ label: last ? T.btn_start_game : T.btn_next, action: last ? null : () => showTutorial(page + 1) }]);
  };

  // 画面にもどってきたとき：BGM。離れるとき：歩くのを止める
  useFocusEffect(
    useCallback(() => {
      updateBgm();
      return () => {
        stopWalking();
        pauseBgmSoon();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const mapState = { floor: g.floor, px: g.px, py: g.py, dir: g.dir, foundLost: g.foundLost };

  return (
    <SafeArea style={styles.root}>
      {/* 左：階の名前と十字ボタン */}
      <View style={styles.left}>
        <View style={[windowStyle, styles.floor]}>
          <Txt style={styles.floorText}>{NAMES[g.floor]}</Txt>
        </View>
        {/* 所持金・HP・攻撃力 */}
        <View style={[windowStyle, styles.status]}>
          <Txt style={styles.statusText}>{fmt(T.status_map, g.money, g.hp, g.maxHp, g.attack())}</Txt>
        </View>
        {/* メニュー（ステータス・持ち物・記録） */}
        <Pressable
          style={({ pressed }) => [nibButtonStyle, styles.menu, pressed && { opacity: 0.7 }]}
          onPress={() => {
            if (talking.current) return;
            stopWalking();
            se('se_menu_open');
            router.push('/status');
          }}>
          <Txt style={styles.menuText}>{T.btn_menu}</Txt>
        </Pressable>
        <View style={{ flex: 1 }} />
        {/* 十字ボタン */}
        <View style={styles.pad}>
          <PadButton label="▲" style={styles.up} onDown={() => padDown(0, -1)} onUp={padUp} />
          <PadButton label="▼" style={styles.down} onDown={() => padDown(0, 1)} onUp={padUp} />
          <PadButton label="◀" style={styles.leftBtn} onDown={() => padDown(-1, 0)} onUp={padUp} />
          <PadButton label="▶" style={styles.rightBtn} onDown={() => padDown(1, 0)} onUp={padUp} />
        </View>
      </View>

      {/* 右：マップ */}
      <View style={styles.map} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {size.w > 0 && g.px >= 0 && (
          <DrawCanvas
            width={size.w}
            height={size.h}
            deps={[mapState.floor, mapState.px, mapState.py, mapState.dir, mapState.foundLost, look, walkFrame, size.w, size.h]}
            draw={(c) => drawMap(c, size.w, size.h, mapState, look, walkFrame)}
          />
        )}
      </View>

      {/* メッセージウィンドウ */}
      {msg && (
        <View style={[windowStyle, styles.msgBox]}>
          <Txt style={styles.msgText}>{msg.text}</Txt>
          <View style={styles.msgButtons}>
            {msg.choices.map((ch) => (
              <Pressable
                key={ch.label}
                style={({ pressed }) => [windowStyle, styles.msgButton, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  se('se_ok');
                  talking.current = false;
                  setMsg(null);
                  ch.action?.();
                }}>
                <Txt style={styles.msgButtonText}>{ch.label}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* デバッグ：理事長のHPをどこから始めるか選ぶ（HPに合わせて、何問目からかも決まる） */}
      <GameDialog
        visible={debugBoss}
        title={T.debug_boss_hp_title}
        onCancel={() => setDebugBoss(false)}
        items={debugHps.map((hp, i) => ({
          label:
            i === debugHps.length - 1
              ? fmt(T.debug_boss_hp_shrink, BOSS_SHRINK_HP)
              : fmt(T.debug_boss_hp_item, hp, TA.boss_stage_names[bossStageOf(hp)]),
          onPress: () => {
            setDebugBoss(false);
            startBossFrom(hp);
          },
        }))}
        buttons={[{ label: T.btn_cancel, onPress: () => setDebugBoss(false) }]}
      />
    </SafeArea>
  );
}

/** 十字ボタンの1つ。押した瞬間に1歩、押しっぱなしで歩き続ける */
function PadButton({ label, style, onDown, onUp }: { label: string; style: object; onDown: () => void; onUp: () => void }) {
  return (
    <Pressable
      onPressIn={onDown}
      onPressOut={onUp}
      style={({ pressed }) => [windowStyle, styles.padButton, style, pressed && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
      <Txt style={styles.padText}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
  },
  left: {
    width: 340,
    padding: 20,
  },
  floor: {
    alignSelf: 'flex-start',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  floorText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  status: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 26,
    lineHeight: 38,
  },
  menu: {
    marginTop: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 26,
  },
  pad: {
    width: 300,
    height: 300,
  },
  padButton: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  up: { left: 100, top: 0 },
  down: { left: 100, bottom: 0 },
  leftBtn: { left: 0, top: 100 },
  rightBtn: { right: 0, top: 100 },
  padText: {
    fontSize: 40,
  },
  map: {
    flex: 1,
  },
  msgBox: {
    position: 'absolute',
    left: 360,
    right: 32,
    bottom: 32,
    padding: 32,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  msgText: {
    fontSize: 36,
    lineHeight: 52,
  },
  msgButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  msgButton: {
    marginLeft: 16,
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  msgButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});
