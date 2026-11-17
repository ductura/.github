// Checks a Dependabot configuration (DAN-922): one YAML document, valid under the
// SchemaStore dependabot-2.0 schema vendored in scripts/dependabot/ (pinned by
// sha256, so the check needs no network), plus the repository rule: weekly npm
// and github-actions updates, each with at least one group.
// Usage: node scripts/dependabot-check.mjs <dependabot.yml>
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseAllDocuments } from "yaml";
import { Ajv } from "ajv";

// SchemaStore/schemastore 2d47a4b71131d25133e2908e312c0133a668cdab, src/schemas/json/dependabot-2.0.json
export const SCHEMA_SHA256 = "814298f5cdcf8701a52d6974958423aa8bd002551466d3d306f66e163040336d";
const REQUIRED_ECOSYSTEMS = ["npm", "github-actions"];

/** Parses the vendored schema bytes; any other content fails closed. */
export const loadSchema = (bytes) => {
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== SCHEMA_SHA256) throw new Error(`schema sha256 ${sha} is not the pinned ${SCHEMA_SHA256}`);
  return JSON.parse(bytes.toString("utf8"));
};

const validatorFor = (() => {
  const cache = new WeakMap();
  return (schema) => {
    if (!cache.has(schema)) {
      // strict mode stays on; only the schema's editor annotation is declared.
      const ajv = new Ajv({ strict: true, allErrors: true });
      ajv.addKeyword({ keyword: "x-intellij-enum-metadata" });
      cache.set(schema, ajv.compile(schema));
    }
    return cache.get(schema);
  };
})();

const isMap = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** Returns every problem in the configuration text; an empty list means it passes. */
export const checkDependabot = (text, schema) => {
  const docs = parseAllDocuments(text, { uniqueKeys: true });
  if (!Array.isArray(docs) || docs.length !== 1) return [`expected one YAML document, found ${docs.length ?? 0}`];
  const [doc] = docs;
  if (doc.errors.length) return doc.errors.map((e) => `YAML: ${e.message}`);
  const config = doc.toJS();
  if (!isMap(config)) return ["the document is not a mapping"];

  const validate = validatorFor(schema);
  if (!validate(config)) return validate.errors.map((e) => `schema: ${e.instancePath || "/"} ${e.message}`);

  const problems = [];
  const updates = config.updates;
  for (const eco of REQUIRED_ECOSYSTEMS) {
    if (!updates.some((u) => u["package-ecosystem"] === eco)) problems.push(`no ${eco} entry`);
  }
  updates.forEach((u, i) => {
    if (u.schedule?.interval !== "weekly") problems.push(`updates[${i}] interval is not weekly`);
    if (!isMap(u.groups) || Object.keys(u.groups).length === 0) problems.push(`updates[${i}] has no group`);
  });
  return problems;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const file = process.argv[2];
  const schema = loadSchema(readFileSync(new URL("dependabot/dependabot-2.0.json", import.meta.url)));
  const problems = file ? checkDependabot(readFileSync(file, "utf8"), schema) : ["usage: dependabot-check.mjs <file>"];
  for (const p of problems) console.error(`::error file=${file}::${p}`);
  if (problems.length) process.exit(1);
  console.log(`${file}: matches the Dependabot schema and the repository rule`);
}
