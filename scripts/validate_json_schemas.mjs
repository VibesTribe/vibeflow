#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });
await maybeAddFormats();

const DEFAULT_BASE = "https://json-schema.org";
const META_SCHEMAS = new Map([
  ["http://json-schema.org/draft-07/schema#", `${DEFAULT_BASE}/draft-07/schema`],
  ["https://json-schema.org/draft-07/schema#", `${DEFAULT_BASE}/draft-07/schema`],
  ["https://json-schema.org/draft/2020-12/schema", `${DEFAULT_BASE}/draft/2020-12/schema`],
]);

async function maybeAddFormats() {
  try {
    const module = await import("ajv-formats");
    if (typeof module.default === "function") {
      module.default(ajv);
    }
  } catch (error) {
    console.warn(`[validate_json_schemas] ajv-formats not available: ${error.message}`);
  }
}

async function ensureMetaSchema(url) {
  if (!META_SCHEMAS.has(url)) {
    return;
  }
  const cached = META_SCHEMAS.get(url);
  if (cached === true) {
    return;
  }
  const response = await fetch(cached);
  if (!response.ok) {
    throw new Error(`Failed to fetch meta schema ${url}: ${response.status}`);
  }
  const schema = await response.json();
  ajv.addMetaSchema(schema, url);
  META_SCHEMAS.set(url, true);
}

async function validateSchema(file) {
  const schemaText = await fs.readFile(file, "utf8");
  const schema = JSON.parse(schemaText);
  if (typeof schema.$schema === "string") {
    await ensureMetaSchema(schema.$schema);
  }
  ajv.removeSchema(file);
  ajv.compile(schema);
  console.log(`[validate_json_schemas] valid ${file}`);
}

async function main() {
  const targets = process.argv.slice(2);
  const files = targets.length > 0 ? targets : ["contracts/plan.schema.json", "contracts/task_packet.schema.json"];
  for (const target of files) {
    const resolved = path.resolve(target);
    await validateSchema(resolved);
  }
}

main().catch((error) => {
  console.error(`[validate_json_schemas] ${error.message}`);
  process.exit(1);
});
