import tseslint from "typescript-eslint";
import {
  kebabCaseFilename,
  onlyTs,
  testFileSuffix,
} from "./rules/file-name.js";
import { importBoundary } from "./rules/import-boundary.js";

const localPlugin = {
  meta: { name: "local" },
  rules: {
    "kebab-case-filename": kebabCaseFilename,
    "test-file-suffix": testFileSuffix,
    "only-ts": onlyTs,
    "import-boundary": importBoundary,
  },
};

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (names) => ({
  regex: `^(?:${names.map(escape).join("|")})$`,
  match: true,
});

/**
 * The Ductura code rules (docs/CODE_STYLE.md in ductura/server). Inline
 * directives are off, so an `eslint-disable` comment cannot switch a rule off.
 * @param {import("./index.d.ts").Options} [options]
 * @returns {import("eslint").Linter.Config[]}
 */
export function ductura({
  boundaries = false,
  propertyNames = [],
  methodNames = [],
} = {}) {
  const naming = [
    { selector: "default", format: ["camelCase"] },
    { selector: "variable", format: ["camelCase", "PascalCase", "UPPER_CASE"] },
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: ["property", "method", "accessor"],
      modifiers: ["requiresQuotes"],
      format: null,
    },
  ];
  if (propertyNames.length > 0)
    naming.push({
      selector: "property",
      filter: exact(propertyNames),
      format: null,
    });
  if (methodNames.length > 0)
    naming.push({
      selector: "objectLiteralMethod",
      filter: exact(methodNames),
      format: null,
    });

  return [
    { ignores: ["**/node_modules/", "**/dist/", "**/coverage/"] },
    {
      linterOptions: { noInlineConfig: true },
      plugins: { "@typescript-eslint": tseslint.plugin, local: localPlugin },
      languageOptions: {
        parser: tseslint.parser,
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    {
      // Any script extension other than lowercase .ts, in any letter case (x.TS, x.Js).
      files: ["**/*.{[cCmM],}[jJtT][sS]{[xX],}"],
      ignores: ["**/*.ts"],
      rules: { "local/only-ts": "error" },
    },
    {
      files: ["**/*.ts"],
      rules: {
        "local/kebab-case-filename": "error",
        "local/test-file-suffix": "error",
        "local/import-boundary": boundaries ? "error" : "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSEnumDeclaration",
            message: "enum is not allowed; use a union of literals.",
          },
        ],
        "@typescript-eslint/naming-convention": ["error", ...naming],
      },
    },
  ];
}
