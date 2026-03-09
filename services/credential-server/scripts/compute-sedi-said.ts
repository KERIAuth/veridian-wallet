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

import { Saider } from "signify-ts";
import { readFileSync, writeFileSync, renameSync } from "fs";
import { join } from "path";

const schemaPath = join(__dirname, "../src/schemas/EHpD0f1XjVCMDnL6JXaeFqnOkBSmlzDAyuJcZiNBHDos");
const raw = JSON.parse(readFileSync(schemaPath, "utf-8"));

// Clear the $id so saidify can compute it
raw["$id"] = "";

const [saidified, said] = Saider.saidify(raw);

console.log("Computed SEDI schema SAID:", said);
console.log("Replace placeholder EHpD0f1XjVCMDnL6JXaeFqnOkBSmlzDAyuJcZiNBHDos with this SAID.");

// Write saidified schema to new file with correct SAID as filename
const newPath = join(__dirname, `../src/schemas/${said}`);
writeFileSync(newPath, JSON.stringify(saidified, null, 2));
console.log("Written:", newPath);

// Remove placeholder file if it was a placeholder
if (said !== "EHpD0f1XjVCMDnL6JXaeFqnOkBSmlzDAyuJcZiNBHDos") {
  renameSync(schemaPath, schemaPath + ".old");
  console.log("Placeholder file renamed to .old — safe to delete.");
}
