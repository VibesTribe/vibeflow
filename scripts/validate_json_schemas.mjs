#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
const draft7 = await import("ajv/dist/refs/json-schema-draft-07.json", { assert: { type: "json" } });
ajv.addMetaSchema(draft7.default, "http://json-schema.org/draft-07/schema#");
ajv.addMetaSchema(draft7.default, "https://json-schema.org/draft-07/schema#");

async function validateSchema(file) {
  const schemaText = await fs.readFile(file, "utf8");
  const schema = JSON.parse(schemaText);
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
