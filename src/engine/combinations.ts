export function kCombos(n: number, k: number): number[][] {
  const combinations: number[][] = [];
  const combination: number[] = [];

  function visit(start: number): void {
    if (combination.length === k) {
      combinations.push([...combination]);
      return;
    }

    const remaining = k - combination.length;

    for (let index = start; index <= n - remaining; index += 1) {
      combination.push(index);
      visit(index + 1);
      combination.pop();
    }
  }

  visit(0);
  return combinations;
}
