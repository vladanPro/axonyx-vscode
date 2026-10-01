"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { addIconsToMaterialTheme } = require("../material-icons");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "axonyx-icons-test-"));
const materialPath = path.join(root, "pkief.material-icon-theme-1.0.0");
const themePath = "./dist/material-icons.json";
const assetsPath = path.resolve(__dirname, "..");
const settings = { "*.custom": "custom-icon", "*.ax": "old-icon" };

const vscode = {
  ConfigurationTarget: { Global: 1 },
  extensions: {
    getExtension(id) {
      assert.strictEqual(id, "pkief.material-icon-theme");
      return {
        extensionPath: materialPath,
        packageJSON: { contributes: { iconThemes: [{ id: "material-icon-theme", path: themePath }] } },
      };
    },
  },
  workspace: {
    getConfiguration(section) {
      assert.strictEqual(section, "material-icon-theme.files");
      return {
        inspect(key) {
          assert.strictEqual(key, "associations");
          return { globalValue: settings };
        },
        async update(key, value, target) {
          assert.strictEqual(key, "associations");
          assert.strictEqual(target, vscode.ConfigurationTarget.Global);
          Object.assign(settings, value);
        },
      };
    },
  },
};

(async () => {
  try {
    await addIconsToMaterialTheme(vscode, assetsPath);
    assert.strictEqual(settings["*.custom"], "custom-icon");
    assert.strictEqual(settings["*.asx"], "../../icons/axonyx/axonyx-bronze");
    assert.strictEqual(settings["*.ax"], "../../icons/axonyx/axonyx-silver");

    for (const metal of ["bronze", "silver"]) {
      const fileName = `axonyx-${metal}.svg`;
      const copied = path.join(root, "icons", "axonyx", fileName);
      assert.strictEqual(fs.readFileSync(copied, "utf8"), fs.readFileSync(path.join(assetsPath, "assets", fileName), "utf8"));
    }

    await addIconsToMaterialTheme(vscode, assetsPath);
    assert.deepStrictEqual(Object.keys(settings).sort(), ["*.asx", "*.ax", "*.custom"].sort());

    await assert.rejects(
      () => addIconsToMaterialTheme({ extensions: { getExtension: () => undefined } }, assetsPath),
      /Install Material Icon Theme/,
    );
    console.log("Material Icon Theme opt-in smoke test passed.");
  } finally {
    if (path.dirname(root) === os.tmpdir()) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
