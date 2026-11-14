const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vscode = require("vscode");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.run = async () => {
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
  assert.deepEqual(await fs.readdir(root), [], "Open an empty disposable workspace");
  const schema = path.join(root, ".axonyx", "db");
  await fs.mkdir(schema, { recursive: true });
  await fs.writeFile(path.join(schema, "schema.json"), JSON.stringify({
    tables: [{ name: "posts", columns: [{ name: "slug", ax_type: "String" }] }],
  }));
  const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "loader.ax");
  await fs.writeFile(uri.fsPath, 'export query loadPosts() -> String {\n  data posts = db.posts.\n}');
  const doc = await vscode.workspace.openTextDocument(uri);
  assert.equal(doc.languageId, "ax");
  const editor = await vscode.window.showTextDocument(doc);
  const at = () => new vscode.Position(1, doc.lineAt(1).text.length);
  const completions = () => vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider", doc.uri, at(),
  );
  const deadline = Date.now() + 12000;
  let methods = [];
  do {
    methods = (await completions()).items;
    if (methods.some((item) => item.label === "where" && item.kind === vscode.CompletionItemKind.Method)) break;
    await delay(250);
  } while (Date.now() < deadline);
  assert.ok(methods.some((item) => item.label === "where" && item.kind === vscode.CompletionItemKind.Method));
  assert.ok(methods.some((item) => item.label === "all"));

  for (const [text, trigger] of [
    ["  data posts = db.posts.where(", "{"],
    ["  data posts = db.posts.where({ title: input.title", ","],
  ]) {
    await editor.edit((edit) => edit.replace(doc.lineAt(1).range, text));
    editor.selection = new vscode.Selection(at(), at());
    await vscode.commands.executeCommand("hideSuggestWidget");
    await vscode.commands.executeCommand("type", { text: trigger });
    await delay(800);
    await vscode.commands.executeCommand("acceptSelectedSuggestion");
    assert.match(doc.lineAt(1).text, /slug/, `No automatic column suggestion after ${trigger}`);
  }
  console.log("VS Code database completion passed: methods and automatic column suggestions.");
};
