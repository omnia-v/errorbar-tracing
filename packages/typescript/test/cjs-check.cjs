// CJS interception check: setup() before require("openai") must patch it.
const { setup } = require("../dist/index.js");
setup({ apiKey: "ci", endpoint: "http://127.0.0.1:9" });
const { OpenAI } = require("openai");
const create = OpenAI.Chat.Completions.prototype.create;
if (!create.__wrapped) {
  console.error("CJS interception BROKEN: openai require was not patched");
  process.exit(1);
}
console.log("cjs interception ok");
process.exit(0);
