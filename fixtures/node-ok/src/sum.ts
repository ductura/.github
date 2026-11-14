export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function first(values: readonly number[]): number | undefined {
  return values[0];
}
