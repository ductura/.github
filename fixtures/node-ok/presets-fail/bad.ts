// Must fail under @ductura/tsconfig. The presets job expects exactly these codes.
// TS7006: parameter implicitly has an 'any' type (strict).
export function double(value) {
  return value * 2;
}

// TS2532: possibly undefined (noUncheckedIndexedAccess).
export function firstLength(values: string[]): number {
  return values[0].length;
}
