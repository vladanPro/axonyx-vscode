"use strict";

const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");

const COMPONENTS = [
  "Head", "Title", "Theme", "Meta", "Link", "Script", "Container", "Grid", "Slot",
  "Button", "ButtonGroup", "IconButton", "LinkButton", "SectionCard", "HeroCard",
  "ContentGrid", "Stack", "Cluster", "Box", "Flex", "Center", "Spacer", "Inset",
  "Bleed", "Header", "Main", "Sidebar", "Footer", "AppShell", "Card", "Copy",
  "Badge", "Chip", "Alert", "Field", "FieldLabel", "FieldHint", "FieldError",
  "Form", "FormGroup", "Fieldset", "Legend", "Input", "Textarea", "Select",
  "Option", "Checkbox", "Radio", "Switch", "Slider", "MachineSwitch", "Table",
  "TableHead", "TableBody", "TableRow", "TableCell", "TableHeaderCell",
  "TableCaption", "Pagination", "PaginationItem", "PaginationEllipsis",
  "Breadcrumbs", "BreadcrumbItem", "BreadcrumbCurrent", "Command", "CommandList",
  "Menu", "MenuItem", "DropdownMenu", "DropdownItem", "Drawer", "Modal",
  "Popover", "Tooltip", "Tabs", "Tab", "Accordion", "AccordionItem", "Toast",
  "ToastViewport", "StatusLamp", "Progress", "Skeleton", "Rating", "Stat",
  "Timeline", "TimelineItem", "List", "ListItem", "Surface", "Toolbar",
  "EmptyState", "Avatar"
];

const PROPS = [
  "href", "variant", "surface", "border", "brush", "gap", "align", "cols", "max",
  "title", "tone", "active", "state", "placeholder", "disabled", "invalid", "surface",
  "railWidth", "brand", "layout", "density", "method", "action", "htmlFor", "id",
  "name", "type", "value", "checked", "size", "scope", "current", "total", "previous",
  "next", "padding", "justify", "wrap", "open", "side", "label"
];

const VALUE_SUGGESTIONS = {
  variant: ["primary", "ghost", "accent", "outline"],
  surface: ["brushed", "forged", "inset"],
  border: ["forged"],
  brush: ["horizontal", "vertical", "diagonal", "reverse-diagonal"],
  gap: ["sm", "md", "lg", "xl", "2xl"],
  align: ["start", "center", "end", "stretch", "left", "right"],
  max: ["md", "lg", "xl"],
  tone: ["lead", "muted", "eyebrow"],
  state: ["error", "success", "warning"],
  layout: ["grid", "inline"],
  density: ["compact", "sm", "md", "lg"],
  size: ["sm", "md", "lg"],
  padding: ["sm", "md", "lg"],
  justify: ["start", "center", "end", "between"],
  wrap: ["true", "false"],
  current: ["true", "false"],
  disabled: ["true", "false"],
  checked: ["true", "false"],
  open: ["open", ""],
  side: ["left", "right", "top", "bottom"],
  active: ["docs", "components", "examples", "getting-started", "button", "card", "forms", "command", "layout", "surfaces"]
};

const HOVER_DOCS = {
  Button: "**Button**\n\nAction or navigation control. Common props: `variant`, `surface`, `border`, `href`, `disabled`.",
  SectionCard: "**SectionCard**\n\nFoundry content panel. Supports `title`, `surface`, `brush`, and `border`.",
  ContentGrid: "**ContentGrid**\n\nResponsive content grid. Common props: `cols`, `gap`.",
  Stack: "**Stack**\n\nVertical layout primitive. Common props: `gap`, `align`.",
  Cluster: "**Cluster**\n\nHorizontal wrapping layout primitive for buttons, badges, nav items, and toolbars.",
  Card: "**Card**\n\nGeneric Foundry work surface. Supports brushed, forged, inset, and forged border treatments.",
  Copy: "**Copy**\n\nText primitive. Common tones: `lead`, `muted`, `eyebrow`.",
  Field: "**Field**\n\nForm wrapper for label, hint, error, and controls. Use `state=\"error\"` for error UI.",
  Form: "**Form**\n\nNative form wrapper. Common props: `method`, `action`, `layout`, `density`, `surface`.",
  FormGroup: "**FormGroup**\n\nResponsive form layout group. Common props: `cols`, `gap`.",
  Fieldset: "**Fieldset**\n\nSemantic grouped controls. Use `surface=\"forged\"` for Foundry panel treatment.",
  Legend: "**Legend**\n\nFieldset title primitive.",
  FieldLabel: "**FieldLabel**\n\nStandalone label primitive. Use `htmlFor` to link it to a control id.",
  FieldHint: "**FieldHint**\n\nStandalone helper text below a control.",
  FieldError: "**FieldError**\n\nStandalone validation error text.",
  Input: "**Input**\n\nInset metal text input.",
  Select: "**Select**\n\nNative select styled with Foundry inset/forged treatments.",
  Table: "**Table**\n\nData table wrapper. Common props: `density`, `zebra`.",
  TableHead: "**TableHead**\n\nSemantic table header section.",
  TableBody: "**TableBody**\n\nSemantic table body section.",
  TableRow: "**TableRow**\n\nSemantic table row.",
  TableCell: "**TableCell**\n\nTable data cell. Use `align=\"right\"` or `align=\"center\"` when needed.",
  TableHeaderCell: "**TableHeaderCell**\n\nTable header cell. Common props: `scope`, `align`.",
  TableCaption: "**TableCaption**\n\nAccessible table caption.",
  Pagination: "**Pagination**\n\nPaged navigation wrapper. Supports summary props and child page items.",
  PaginationItem: "**PaginationItem**\n\nPage link child for Pagination. Common props: `href`, `current`, `disabled`.",
  PaginationEllipsis: "**PaginationEllipsis**\n\nVisual gap marker for numbered Pagination.",
  Box: "**Box**\n\nLayout primitive for padding and surface grouping.",
  Flex: "**Flex**\n\nFlexible row/column layout primitive. Common props: `gap`, `align`, `justify`, `wrap`.",
  AppShell: "**AppShell**\n\nWorkspace shell for docs, dashboards, and CMS/admin layouts.",
  Command: "**Command**\n\nDeveloper-grade command palette surface.",
  CommandItem: "**CommandItem**\n\nCommand palette option. Supports `active` and `shortcut`.",
  AxMasthead: "**AxMasthead**\n\nAxonyx site-level navigation component. Props: `brand`, `active`.",
  AxSidebar: "**AxSidebar**\n\nAxonyx docs/sidebar navigation component. Props: `title`, `active`.",
  route: "**route**\n\nReserved runtime binding for request route context. Use `route.path`, `route.section`, `route.item`, `route.segments`.",
  "route.path": "**route.path**\n\nFull request path, for example `/components/button`.",
  "route.section": "**route.section**\n\nFirst route segment, for example `components` from `/components/button`.",
  "route.item": "**route.item**\n\nSecond route segment, for example `button` from `/components/button`.",
  "route.segments": "**route.segments**\n\nArray of path segments. Planned runtime context field."
};

function activate(context) {
  const output = vscode.window.createOutputChannel("Axonyx");
  const collection = vscode.languages.createDiagnosticCollection("axonyx");
  const runner = new AxonyxDiagnosticRunner(collection, output);

  context.subscriptions.push(output, collection);
  context.subscriptions.push(registerAxonyxCompletions());
  context.subscriptions.push(registerAxonyxHovers());
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

function registerAxonyxCompletions() {
  return vscode.languages.registerCompletionItemProvider(
    { language: "ax", scheme: "file" },
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        if (/route\.$/.test(linePrefix)) {
          return ["path", "section", "item", "segments"].map((name) => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
            item.insertText = name;
            item.detail = `route.${name}`;
            return item;
          });
        }

        const valueMatch = linePrefix.match(/([A-Za-z][\w-]*)\s*=\s*"[^"]*$/);
        if (valueMatch && VALUE_SUGGESTIONS[valueMatch[1]]) {
          return VALUE_SUGGESTIONS[valueMatch[1]].map((value) => {
            const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
            item.insertText = value;
            item.detail = `${valueMatch[1]} value`;
            return item;
          });
        }

        if (/<[A-Za-z][\w-]*\s+[^>]*$/.test(linePrefix)) {
          return PROPS.map((prop) => {
            const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
            item.insertText = new vscode.SnippetString(`${prop}=\"$1\"`);
            item.detail = "Axonyx prop";
            return item;
          });
        }

        if (/<[A-Za-z]*$/.test(linePrefix)) {
          return COMPONENTS.map((name) => {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
            item.insertText = name;
            item.detail = "Axonyx component";
            return item;
          });
        }

        return ["page", "component", "import", "let", "route"].map((word) => {
          const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Keyword);
          item.insertText = word;
          return item;
        });
      }
    },
    ".", "<", "\"", " ", "="
  );
}

function registerAxonyxHovers() {
  return vscode.languages.registerHoverProvider(
    { language: "ax", scheme: "file" },
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?/);
        if (!range) return null;
        const word = document.getText(range);
        const doc = HOVER_DOCS[word];
        if (!doc) return null;
        return new vscode.Hover(new vscode.MarkdownString(doc), range);
      }
    }
  );
}

class AxonyxDiagnosticRunner {
  constructor(collection, output) {
    this.collection = collection;
    this.output = output;
    this.pending = new Map();
    this.hasWarned = false;
  }

  async validate(document, force = false) {
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
        const diagnostics = getLocalValueDiagnostics(document);
        try {
          diagnostics.push(...(await runAxCheck(document)));
        } catch (error) {
          this.reportExecutionIssue(error, document);
        }
        this.collection.set(document.uri, diagnostics);
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

function getLocalValueDiagnostics(document) {
  const diagnostics = [];
  const text = document.getText();
  const regex = /\b(variant|surface|border|brush|gap|align|max|tone|state)\s*=\s*"([^"]+)"/g;
  let match;

  while ((match = regex.exec(text))) {
    const prop = match[1];
    const value = match[2];
    const allowed = VALUE_SUGGESTIONS[prop];
    if (!allowed || allowed.includes(value)) continue;

    const start = document.positionAt(match.index + match[0].indexOf(value));
    const end = document.positionAt(match.index + match[0].indexOf(value) + value.length);
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start, end),
      `Invalid ${prop} value "${value}". Expected one of: ${allowed.join(", ")}.`,
      vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = "axonyx";
    diagnostic.code = "axonyx-prop-value";
    diagnostics.push(diagnostic);
  }

  return diagnostics;
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
