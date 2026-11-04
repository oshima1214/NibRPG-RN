/**
 * 一時停止できるタイマー（Java版の PauseHandler）。戦闘画面で使う。
 *   ・after(ms, fn) で「あとでやること」を予約する
 *   ・pause() すると、予約した時間のカウントが止まる。resume() で続きから進む
 *   ・now() は「止まっていた時間をのぞいた時刻」。制限時間の計算に使うと、止めている間は時間が減らない
 *   ・画面を閉じるときは clear() で予約を全部消す
 */
type Task = { fn: () => void; due: number; id: ReturnType<typeof setTimeout> | null };

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class PauseTimer {
  private tasks = new Set<Task>();
  private paused = false;
  private pausedAt = 0;
  private pausedTotal = 0;

  /** 止まっていた時間をのぞいた、今の時刻（ミリ秒） */
  now(): number {
    return (this.paused ? this.pausedAt : clock()) - this.pausedTotal;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** ms ミリ秒あとに fn をする（止めている間は、時間が進まない） */
  after(ms: number, fn: () => void): void {
    const t: Task = { fn, due: this.now() + ms, id: null };
    this.tasks.add(t);
    if (!this.paused) this.arm(t, ms);
  }

  private arm(t: Task, ms: number) {
    t.id = setTimeout(() => {
      this.tasks.delete(t);
      t.fn();
    }, Math.max(0, ms));
  }

  /** 予約を全部取り消す */
  clear(): void {
    for (const t of this.tasks) if (t.id) clearTimeout(t.id);
    this.tasks.clear();
  }

  /** 一時停止：予約した仕事を止める */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pausedAt = clock();
    for (const t of this.tasks) {
      if (t.id) clearTimeout(t.id);
      t.id = null;
    }
  }

  /** 再開：残り時間で、予約し直す */
  resume(): void {
    if (!this.paused) return;
    this.pausedTotal += clock() - this.pausedAt;
    this.paused = false;
    const n = this.now();
    for (const t of this.tasks) this.arm(t, t.due - n);
  }
}
