// Shared normalization of plan text for the plan checks (DAN-954, DAN-988):
// compatibility forms, invisible characters (zero-width, word joiner, soft
// hyphen, invisible operators) and disguised dots do not hide a finding.
export const normalize = (text) =>
  text
    .normalize("NFKC")
    .replace(/[­​-‍⁠-⁤﻿]/g, "")
    .replace(/[。．｡]/g, ".")
    .replace(/\\\./g, ".")
    .replace(/\[\.\]/g, ".")
    .replace(/[ \t]+\./g, ".");
