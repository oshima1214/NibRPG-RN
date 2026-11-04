/**
 * Java の getString(id, 値…) と同じように、文字の中の %1$s・%2$d などに値を入れる。
 *   fmt('%1$sに %2$d のダメージ！', 'S先生', 12) → 'S先生に 12 のダメージ！'
 * 番号のない %s・%d も、前から順に入れる。
 */
export function fmt(template: string, ...values: (string | number)[]): string {
  let next = 0;
  return template.replace(/%(?:(\d+)\$)?([sd])/g, (_m, num: string | undefined) => {
    const i = num ? Number(num) - 1 : next++;
    const v = values[i];
    return v === undefined ? '' : String(v);
  });
}
