"use strict";

const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");

function activate(context) {
  const output = vscode.window.createOutputChannel("Axonyx");
  const collection = vscode.languages.createDiagnosticCollection("axonyx");
  const runner = new AxonyxDiagnosticRunner(collection, output);

  context.subscriptions.push(output, collection);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      runner.validate(document);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      runner.validate(document);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === "ax") {
        collection.delete(document.uri);
      }
    }),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        runner.validate(editor.document);
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("axonyx.runDiagnostics", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await runner.validate(editor.document, true);
      }
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    runner.validate(document);
  }
}

function deactivate() {}

class AxonyxDiagnosticRunner {
  constructor(collection, output) {
    this.collection = collection;
    this.output = output;
    this.pending = new Map();
    this.hasWarned = false;
  }

  validate(document, force = false) {
    if (document.languageId !== "ax" || document.uri.scheme !== "file") {
      return Promise.resolve();
    }

    if (!force && document.isUntitled) {
      return Promise.resolve();
    }

    const key = document.uri.toString();
    if (this.pending.has(key)) {
      clearTimeout(this.pending.get(key));
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.pending.delete(key);
        try {
          const diagnostics = await runAxCheck(document);
          this.collection.set(document.uri, diagnostics);
        } catch (error) {
          this.collection.delete(document.uri);
          this.reportExecutionIssue(error, document);
        }
        resolve();
      }, force ? 0 : 250);

      this.pending.set(key, timer);
    });
  }

  reportExecutionIssue(error, document) {
    this.output.appendLine(
      `[diagnostics] ${path.basename(document.uri.fsPath)}: ${String(error.message || error)}`,
    );

    if (!this.hasWarned) {
      this.hasWarned = true;
      vscode.window.showWarningMessage(
        "Axonyx diagnostics are unavailable until `cargo ax check` can run. See the Axonyx output panel for details.",
      );
    }
  }
}

async function runAxCheck(document) {
  const command = resolveCheckCommand(document.uri.fsPath);
  const { stdout, stderr, exitCode } = await execFile(command.command, command.args, {
    cwd: command.cwd,
  });

  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();

  if (trimmedStdout.length === 0) {
    if (exitCode === 0) {
      return [];
    }
    throw new Error(trimmedStderr || "Axonyx check did not return diagnostics.");
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmedStdout);
  } catch (error) {
    throw new Error(trimmedStderr || trimmedStdout || error.message);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Axonyx check returned an unexpected diagnostics payload.");
  }

  return parsed.map((diagnostic) => toVsCodeDiagnostic(diagnostic));
}

function toVsCodeDiagnostic(diagnostic) {
  const line = Math.max((diagnostic.line || 1) - 1, 0);
  const column = Math.max((diagnostic.column || 1) - 1, 0);
  const range = new vscode.Range(line, column, line, column + 1);
  const severity = mapSeverity(diagnostic.severity);
  const item = new vscode.Diagnostic(range, diagnostic.message, severity);
  item.source = "axonyx";
  item.code = diagnostic.code;
  return item;
}

function mapSeverity(severity) {
  switch (severity) {
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "information":
      return vscode.DiagnosticSeverity.Information;
    case "hint":
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Error;
  }
}

function resolveCheckCommand(filePath) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
  const localFrameworkManifest = findLocalFrameworkManifest(cwd);

  if (localFrameworkManifest) {
    return {
      command: "cargo",
      args: [
        "run",
        "--quiet",
        "--manifest-path",
        localFrameworkManifest,
        "--bin",
        "cargo-ax",
        "--",
        "check",
        "--format",
        "json",
        "--file",
        filePath,
      ],
      cwd,
    };
  }

  return {
    command: "cargo",
    args: ["ax", "check", "--format", "json", "--file", filePath],
    cwd,
  };
}

function findLocalFrameworkManifest(startDir) {
  let current = startDir;

  while (true) {
    const direct = path.join(current, "axonyx-framework", "Cargo.toml");
    if (fs.existsSync(direct)) {
      return direct;
    }

    const sibling = path.join(current, "..", "axonyx-framework", "Cargo.toml");
    if (fs.existsSync(sibling)) {
      return path.normalize(sibling);
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function execFile(command, args, options) {
  return new Promise((resolve, reject) => {
    cp.execFile(command, args, options, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout, stderr, exitCode: 0 });
        return;
      }

      if (typeof error.code === "number") {
        resolve({ stdout, stderr, exitCode: error.code });
        return;
      }

      reject(error);
    });
  });
}

module.exports = {
  activate,
  deactivate,
};
