/**
 * Computes the real SAID for the SEDI credential schema using saidify().
 * Run this once and replace all occurrences of the placeholder SAID.
 *
 * Usage:
 *   npx ts-node scripts/compute-sedi-said.ts
 *
 * Then replace every occurrence of EHpD0f1XjVCMDnL6JXaeFqnOkBSmlzDAyuJcZiNBHDos
 * with the SAID printed by this script, including the schema filename in src/schemas/.
 */

import { Saider, MtrDex, Serials } from "signify-ts";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

const PLACEHOLDER = "EHpD0f1XjVCMDnL6JXaeFqnOkBSmlzDAyuJcZiNBHDos";
const schemaPath = join(__dirname, `../src/schemas/${PLACEHOLDER}`);
const raw = JSON.parse(readFileSync(schemaPath, "utf-8"));

// Clear the $id so saidify computes it fresh
raw["$id"] = "";

// Saider.saidify returns [Saider, Dict<any>]
//   [0] → Saider instance  (.qb64 = the SAID string)
//   [1] → saidified object (the JSON with $id filled in)
// Pass "$id" as the label so saidify targets that field instead of the default "d".
// Signature: saidify(sad, code, kind, label)
const result = Saider.saidify(raw, MtrDex.Blake3_256, Serials.JSON, "$id") as unknown as [{ qb64: string }, Record<string, unknown>];
const said: string = result[0].qb64;
const saidified: Record<string, unknown> = result[1];

console.log("Computed SEDI schema SAID:", said);
console.log("\nReplace placeholder:", PLACEHOLDER);
console.log("With real SAID:     ", said);

// Write saidified schema named with the real SAID
const newPath = join(__dirname, `../src/schemas/${said}`);
writeFileSync(newPath, JSON.stringify(saidified, null, 2));
console.log("\nWritten:", newPath);

// Remove the placeholder file if SAID differs
if (said !== PLACEHOLDER) {
  if (existsSync(schemaPath)) {
    unlinkSync(schemaPath);
    console.log("Removed placeholder file:", schemaPath);
  }
} else {
  console.log("(SAID matches placeholder — no rename needed)");
}

console.log("\nNext: run the sed commands from the deploy guide to update consts.ts and the frontend.");
