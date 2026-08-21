// ESM interception check — run via:  node --import ../register.mjs esm-check.mjs
// A pure-ESM import of openai must come back PATCHED (shimmer marks wrapped
// functions with __wrapped). This is the exact failure CI exists to catch:
// with two @opentelemetry/instrumentation copies in the tree, interception
// silently no-ops and this assertion is the only thing that notices.
import { OpenAI } from "openai";

const create = OpenAI.Chat.Completions.prototype.create;
if (!create.__wrapped) {
  console.error("ESM interception BROKEN: openai import was not patched");
  process.exit(1);
}
console.log("esm interception ok");
process.exit(0);
