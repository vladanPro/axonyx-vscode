"use strict";

const assert = require("assert");
const manifest = require("../package.json");

const defaults = manifest.contributes?.configurationDefaults?.["[ax]"];

assert.strictEqual(
  defaults?.["editor.defaultFormatter"],
  "vladanpro.axonyx-vscode",
  "Axonyx files should use the Axonyx extension as their default formatter",
);
assert.strictEqual(
  defaults?.["editor.formatOnSave"],
  undefined,
  "formatOnSave must remain an explicit user choice",
);

console.log("Axonyx extension manifest smoke test passed.");
