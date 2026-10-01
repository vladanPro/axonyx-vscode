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

const fs = require("fs");
const path = require("path");
const contribution = manifest.contributes.iconThemes.find(theme => theme.id === "axonyx-foundry");
assert.ok(contribution, "Foundry icon theme must be contributed");
const themePath = path.resolve(__dirname, "..", contribution.path);
const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));
assert.notStrictEqual(theme.fileExtensions.asx, theme.fileExtensions.ax);
assert.strictEqual(theme.fileExtensions.asx, "bronze");
assert.strictEqual(theme.fileExtensions.ax, "silver");
assert.strictEqual(theme.light.fileExtensions.asx, "bronze-light");
assert.strictEqual(theme.light.fileExtensions.ax, "silver-light");
for (const mapping of [theme.fileExtensions, theme.light.fileExtensions]) {
  for (const extension of ["asx", "ax"]) {
    const definition = theme.iconDefinitions[mapping[extension]];
    assert.ok(definition, `${extension} must resolve to an icon definition`);
    const asset = path.resolve(path.dirname(themePath), definition.iconPath);
    assert.ok(fs.readFileSync(asset, "utf8").includes("<svg"), `${extension} icon must exist`);
  }
}
assert.deepStrictEqual(manifest.contributes.languages[0].extensions, [".asx", ".ax"]);
assert.strictEqual(manifest.contributes.languages[0].id, "ax");
assert.ok(
  manifest.contributes.commands.some(({ command }) => command === "axonyx.addIconsToMaterialTheme"),
  "Material Icon Theme integration must be available as an explicit command",
);
console.log("Foundry icon associations and language compatibility passed.");
