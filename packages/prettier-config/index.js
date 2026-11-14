// The format Ductus code is written in. Ductus has no formatter: these values
// were measured on its src/ and app/, where 120 columns changes the fewest
// files. Prettier defaults are spelled out so a new Prettier default cannot
// change the format.
/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
};

export default config;
