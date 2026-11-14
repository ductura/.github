import type { Linter } from "eslint";

export type Options = {
  /** Modular monolith boundaries: another folder only through its index.ts. Default false. */
  boundaries?: boolean;
  /** Exact property names fixed outside the repository (wire or protocol names). */
  propertyNames?: readonly string[];
  /** Exact object-literal method names fixed outside the repository. */
  methodNames?: readonly string[];
};

export function ductura(options?: Options): Linter.Config[];
