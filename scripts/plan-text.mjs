// Shared normalization of plan text for the plan checks (DAN-954, DAN-988):
// compatibility forms, invisible characters and disguised dots do not hide a
// finding. Every default-ignorable or format code point is removed (zero-width,
// joiners, soft hyphen, U+034F, variation selectors, tags, bidi controls, ...).
export const normalize = (text) =>
  text
    .normalize("NFKC")
    .replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}]/gu, "")
    .replace(/[\u3002\uFF0E\uFF61]/g, ".")
    .replace(/\\\./g, ".")
    .replace(/\[\.\]/g, ".")
    .replace(/[ \t]+\./g, ".");
