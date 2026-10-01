"use strict";

const fs = require("fs");
const path = require("path");

const MATERIAL_EXTENSION_ID = "pkief.material-icon-theme";

async function addIconsToMaterialTheme(vscode, extensionPath) {
  const material = vscode.extensions.getExtension(MATERIAL_EXTENSION_ID);
  if (!material) {
    throw new Error("Install Material Icon Theme before adding Axonyx file icons.");
  }

  const theme = material.packageJSON.contributes?.iconThemes?.find(
    (entry) => entry.id === "material-icon-theme",
  );
  if (!theme) {
    throw new Error("The installed Material Icon Theme has no supported file icon theme.");
  }

  const materialThemeDir = path.dirname(path.resolve(material.extensionPath, theme.path));
  const iconsDir = path.join(path.dirname(material.extensionPath), "icons", "axonyx");
  const associations = {};

  for (const [extension, metal] of [["asx", "bronze"], ["ax", "silver"]]) {
    const fileName = `axonyx-${metal}.svg`;
    const source = path.join(extensionPath, "assets", fileName);
    if (!fs.existsSync(source)) {
      throw new Error(`Axonyx icon asset is missing: ${fileName}`);
    }
    const destination = path.join(iconsDir, fileName);
    const relativePath = path.relative(materialThemeDir, destination);
    if (path.isAbsolute(relativePath)) {
      throw new Error("Material and Axonyx icons must be on the same filesystem volume.");
    }
    associations[`*.${extension}`] = relativePath.replaceAll(path.sep, "/").slice(0, -4);
  }

  fs.mkdirSync(iconsDir, { recursive: true });
  for (const metal of ["bronze", "silver"]) {
    const fileName = `axonyx-${metal}.svg`;
    fs.copyFileSync(path.join(extensionPath, "assets", fileName), path.join(iconsDir, fileName));
  }

  const configuration = vscode.workspace.getConfiguration("material-icon-theme.files");
  const current = configuration.inspect("associations")?.globalValue;
  const existing = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  await configuration.update(
    "associations",
    { ...existing, ...associations },
    vscode.ConfigurationTarget.Global,
  );
}

module.exports = { addIconsToMaterialTheme };
