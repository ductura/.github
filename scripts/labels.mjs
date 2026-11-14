// Reads and checks labels.yml, the shared label list for Ductura repositories.
// The file is a strict subset of YAML so that this dependency-free parser and
// any YAML library read the same thing; the label generator (T-0.4) and the
// drift check (T-0.7) import parseLabels/checkLabels instead of parsing again.
// Usage: node scripts/labels.mjs [--json] [file]   (default: labels.yml)
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const GROUPS = new Set(["risk", "area", "role", "state", "bot"]);
// Groups whose labels must carry the group name as a prefix ("area:db").
const PREFIXED = new Set(["risk", "area", "role"]);
const KEYS = ["name", "color", "description", "group"];
const QUOTED_KEYS = new Set(["name", "color", "description"]);
// GitHub limits: 50 characters for a name, 100 for a description.
const MAX_NAME = 50;
const MAX_DESCRIPTION = 100;

/**
 * Labels that the gate, the Grok bots and the orchestrator read or write. A
 * repository that lacks one of them breaks a documented step, so labels.yml
 * must contain each. Sources are in the Ductus repository.
 */
export const REQUIRED_LABELS = [
  { name: "risk:low", group: "risk", source: "ENGINEERING_SYSTEM.md risk levels (the gate reads Risk: from the description; the label mirrors it)" },
  { name: "risk:standard", group: "risk", source: "ENGINEERING_SYSTEM.md risk levels" },
  { name: "risk:critical", group: "risk", source: "ENGINEERING_SYSTEM.md risk levels" },
  { name: "area:auth", group: "area", source: "CLAUDE.md, Trijaža bot labels area:auth" },
  { name: "area:db", group: "area", source: "CLAUDE.md, Trijaža bot labels area:db" },
  { name: "area:sync", group: "area", source: "CLAUDE.md, Trijaža bot labels area:sync" },
  { name: "area:ui", group: "area", source: "CLAUDE.md, Trijaža bot labels area:ui" },
  { name: "role:backend", group: "role", source: "CLAUDE.md, Trijaža bot labels role:backend" },
  { name: "role:frontend", group: "role", source: "CLAUDE.md, Trijaža bot labels role:frontend" },
  { name: "role:platforma", group: "role", source: "CLAUDE.md, Trijaža bot labels role:platforma" },
  { name: "ready-for-claude", group: "state", source: "CLAUDE.md, a Claude session takes work only from this label (D-111)" },
  { name: "claude:in-progress", group: "state", source: "CLAUDE.md, a Claude session sets it when it starts" },
  { name: "izvjestaj-ceka", group: "state", source: "SESSIONS.md §2a and ORKESTRATOR.md, undelivered session report" },
  { name: "plan-napada", group: "bot", source: "CLAUDE.md, Trijaža bot label and work order" },
  { name: "bug", group: "bot", source: "CLAUDE.md, Trijaža bot label and work order" },
  { name: "security", group: "bot", source: "CLAUDE.md, Trijaža bot label and work order" },
  { name: "pitanje-za-grok", group: "bot", source: "CLAUDE.md, question from a Claude session to a Grok bot" },
];

const lines = (text) => text.split(/\r\n|\r|\n/);

// Characters YAML 1.2 allows in a file (§5.1), minus U+2028/U+2029, which
// YAML 1.1 parsers treat as line breaks. With the u flag a lone surrogate is
// its own code point and falls outside the set.
const FORBIDDEN_CHAR = /[^\t\n\r\x20-\x7E\xA0-\u2027\u202A-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;

function checkCharacters(text) {
  const m = FORBIDDEN_CHAR.exec(text);
  if (!m) return;
  const line = lines(text.slice(0, m.index)).length;
  const code = m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  throw new Error(`character U+${code} at line ${line} is not allowed in YAML`);
}

// A double-quoted scalar that means the same in YAML and JSON: printable
// characters, with only \" and \\ as escapes.
function quoted(raw, where) {
  const m = /^"((?:[^"\\\u0000-\u001f]|\\["\\])*)"$/.exec(raw);
  if (m) return m[1].replace(/\\(["\\])/g, "$1");
  if (/^"(?:[^"\\]|\\.)*"$/.test(raw) && /\\[^"\\]/.test(raw)) throw new Error(`${where}: unsupported escape (only \\" and \\\\)`);
  throw new Error(`${where}: value must be a single double-quoted string with nothing after it`);
}

/** Parses labels.yml text into { version, labels }. Throws on any line outside the subset. */
export function parseLabels(text) {
  checkCharacters(text);
  let version = null;
  let inLabels = false;
  const labels = [];
  let current = null;
  const finish = (lineNo) => {
    if (!current) return;
    const missing = KEYS.filter((k) => !(k in current.fields));
    if (missing.length) throw new Error(`label at line ${current.line}: missing ${missing.join(", ")} (before line ${lineNo})`);
    labels.push(current.fields);
    current = null;
  };

  lines(text).forEach((raw, index) => {
    const n = index + 1;
    const where = `line ${n}`;
    if (raw.trim() === "" || /^\s*#/.test(raw)) return;
    let m;
    if (version === null && !inLabels && (m = /^version: +(\S.*)$/.exec(raw))) {
      if (m[1] !== "1") throw new Error(`${where}: unsupported version ${m[1]} (expected 1)`);
      version = 1;
    } else if (version !== null && !inLabels && raw === "labels:") {
      inLabels = true;
    } else if (inLabels && (m = /^ {2}- ([a-z]+): (.*)$/.exec(raw))) {
      finish(n);
      current = { line: n, fields: Object.create(null) };
      setField(current, m[1], m[2], where);
    } else if (inLabels && current && (m = /^ {4}([a-z]+): (.*)$/.exec(raw))) {
      setField(current, m[1], m[2], where);
    } else if (version === null) {
      throw new Error(`${where}: file must start with "version: 1"`);
    } else {
      throw new Error(`${where}: unexpected line: ${JSON.stringify(raw)}`);
    }
  });
  finish(lines(text).length);
  if (version === null) throw new Error('missing "version: 1"');
  if (labels.length === 0) throw new Error("no labels");
  return { version, labels: labels.map((f) => ({ name: f.name, color: f.color, description: f.description, group: f.group })) };
}

function setField(current, key, value, where) {
  if (!KEYS.includes(key)) throw new Error(`${where}: unknown key "${key}"`);
  if (key in current.fields) throw new Error(`${where}: repeated key "${key}"`);
  if (QUOTED_KEYS.has(key)) current.fields[key] = quoted(value, `${where} (${key})`);
  else if (/^[a-z]+$/.test(value)) current.fields[key] = value;
  else throw new Error(`${where}: group must be a bare lowercase word`);
}

/** Structural problems in a parsed label list; [] when it is valid. */
export function validateLabels(labels) {
  const problems = [];
  const seen = new Map();
  labels.forEach((l, i) => {
    const at = `label ${i + 1} ${JSON.stringify(l.name)}`;
    if (typeof l.name !== "string" || l.name.length === 0 || l.name.length > MAX_NAME || l.name.trim() !== l.name) {
      problems.push(`${at}: name must be 1-${MAX_NAME} characters without surrounding spaces`);
    } else {
      // GitHub label names are case-insensitive.
      const key = l.name.toLowerCase();
      if (seen.has(key)) problems.push(`${at}: duplicate of label ${seen.get(key)}`);
      else seen.set(key, i + 1);
    }
    if (!/^[0-9a-f]{6}$/.test(l.color ?? "")) problems.push(`${at}: color must be six lowercase hex digits without #`);
    if (typeof l.description !== "string" || l.description.trim() === "" || l.description.length > MAX_DESCRIPTION) {
      problems.push(`${at}: description must be non-empty and at most ${MAX_DESCRIPTION} characters`);
    }
    if (!GROUPS.has(l.group)) {
      problems.push(`${at}: unknown group ${JSON.stringify(l.group)}`);
    } else if (typeof l.name === "string") {
      // Names are case-insensitive on GitHub, so "AREA:x" is an area label too.
      const prefix = /^([a-z]+):/.exec(l.name.toLowerCase())?.[1];
      const wantPrefix = PREFIXED.has(l.group);
      if (wantPrefix ? prefix !== l.group : PREFIXED.has(prefix)) {
        problems.push(`${at}: group "${l.group}" does not match the name prefix`);
      }
    }
  });
  return problems;
}

/** Required labels absent from the list (case-insensitive, as on GitHub). */
export function missingRequired(labels, required = REQUIRED_LABELS) {
  const names = new Set(labels.map((l) => String(l.name).toLowerCase()));
  return required.map((r) => r.name).filter((name) => !names.has(name.toLowerCase()));
}

/** Every problem in a labels.yml text: syntax, structure and coverage. */
export function checkLabels(text) {
  let parsed;
  try {
    parsed = parseLabels(text);
  } catch (error) {
    return [error.message];
  }
  return [
    ...validateLabels(parsed.labels),
    ...missingRequired(parsed.labels).map((name) => `missing required label "${name}"`),
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const json = args[0] === "--json";
  const files = json ? args.slice(1) : args;
  if (files.length > 1) {
    console.error("usage: node scripts/labels.mjs [--json] [file]");
    process.exit(2);
  }
  const file = files[0] ?? "labels.yml";
  const text = readFileSync(file, "utf8");
  const problems = checkLabels(text);
  for (const p of problems) console.error(`${file}: ${p}`);
  if (problems.length > 0) process.exit(1);
  if (json) console.log(JSON.stringify(parseLabels(text), null, 2));
  else console.log(`labels: ${file}: ${parseLabels(text).labels.length} label(s), no problems`);
}
