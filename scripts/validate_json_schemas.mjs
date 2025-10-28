#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

async function validateSchema(file) {
  const schema = JSON.parse(await fs.readFile(file, "utf8"));
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
