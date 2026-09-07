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
  "next", "padding", "justify", "wrap", "open", "side", "label", "class", "className",
  "items", "as", "when", "slot", "aria-label", "data-ax-behavior"
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
  page: "**page**\n\nPages ASX V1 entry point. Prefer `page Name() { return ASX { ... } }`.",
  component: "**component**\n\nReusable ASX component declaration. Planned shape: props/state/client/style/render.",
  scope: "**scope**\n\nAxonyx composition boundary for page/domain/action injection and shared state.",
  query: "**query**\n\nServer-side data loader function. Use route-local loaders for database/content reads.",
  action: "**action**\n\nServer-side mutation function. Use with native forms and action bindings.",
  route: "**route**\n\nReserved runtime binding for request route context. Use `route.path`, `route.section`, `route.item`, `route.segments`.",
  "route.path": "**route.path**\n\nFull request path, for example `/components/button`.",
  "route.section": "**route.section**\n\nFirst route segment, for example `components` from `/components/button`.",
  "route.item": "**route.item**\n\nSecond route segment, for example `button` from `/components/button`.",
  "route.segments": "**route.segments**\n\nArray of path segments. Planned runtime context field."
};

let activeLanguageServer = null;

function activate(context) {
  const output = vscode.window.createOutputChannel("Axonyx");
  const collection = vscode.languages.createDiagnosticCollection("axonyx");
  const runner = new AxonyxDiagnosticRunner(collection, output);
  const languageServer = new AxonyxLanguageServer(collection, output, runner);
  activeLanguageServer = languageServer;

  context.subscriptions.push(output, collection);
  context.subscriptions.push({ dispose: () => languageServer.stop() });
  context.subscriptions.push(registerAxonyxCompletions(languageServer));
  context.subscriptions.push(registerAxonyxHovers(languageServer));
  context.subscriptions.push(registerAxonyxFormatter(languageServer));
  context.subscriptions.push(registerAxonyxDefinitions(languageServer));
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      validateWithBestAvailableService(languageServer, runner, document);
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (languageServer.running) {
        languageServer.change(event.document);
      }
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (!languageServer.running) {
        runner.validate(document);
      }
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === "ax") {
        if (languageServer.running) {
          languageServer.close(document);
        } else {
          collection.delete(document.uri);
        }
      }
    }),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && !languageServer.running) {
        runner.validate(editor.document);
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("axonyx.runDiagnostics", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // An explicit run keeps the project-aware CLI checks available even
        // while LSP V0 owns fast open-document parser diagnostics.
        await runner.validate(editor.document, true);
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("axonyx.formatDocument", async () => {
      await vscode.commands.executeCommand("editor.action.formatDocument");
    }),
  );

  languageServer.start().then((started) => {
    for (const document of vscode.workspace.textDocuments) {
      if (started) {
        languageServer.open(document);
      } else {
        runner.validate(document);
      }
    }
  });
}

function deactivate() {
  return activeLanguageServer ? activeLanguageServer.stop() : undefined;
}

function validateWithBestAvailableService(languageServer, runner, document) {
  if (languageServer.running) {
    languageServer.open(document);
  } else {
    runner.validate(document);
  }
}

function registerAxonyxCompletions(languageServer) {
  return vscode.languages.registerCompletionItemProvider(
    { language: "ax", scheme: "file" },
    {
      async provideCompletionItems(document, position) {
        if (languageServer.running) {
          try {
            const items = await languageServer.completion(document, position);
            if (items && items.length > 0) return items;
          } catch (_error) {
            // Keep the lightweight Foundry/keyword suggestions after an LSP failure.
          }
        }

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

        return [
          "page", "component", "scope", "query", "action", "guard", "import", "type",
          "state", "data", "const", "let", "return ASX", "route"
        ].map((word) => {
          const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Keyword);
          item.insertText = word;
          return item;
        });
      }
    },
    ".", "<", "\"", " ", "="
  );
}

function registerAxonyxHovers(languageServer) {
  return vscode.languages.registerHoverProvider(
    { language: "ax", scheme: "file" },
    {
      async provideHover(document, position) {
        if (languageServer.running) {
          try {
            const hover = await languageServer.hover(document, position);
            if (hover) return hover;
          } catch (_error) {
            // Static Foundry documentation remains useful if the LSP cannot answer.
          }
        }

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

function registerAxonyxFormatter(languageServer) {
  return vscode.languages.registerDocumentFormattingEditProvider(
    { language: "ax", scheme: "file" },
    {
      async provideDocumentFormattingEdits(document) {
        let formatted;
        if (languageServer.running) {
          try {
            const edits = await languageServer.format(document);
            if (edits !== null) {
              return edits;
            }
          } catch (_error) {
            // The CLI path below keeps format-on-save available after an LSP crash.
          }
        }

        try {
          formatted = await runAxFormat(document);
        } catch (_error) {
          formatted = formatAxonyx(document.getText());
        }
        if (formatted === document.getText()) {
          return [];
        }

        const lastLine = document.lineCount - 1;
        const lastCharacter = document.lineAt(lastLine).text.length;
        const fullRange = new vscode.Range(0, 0, lastLine, lastCharacter);
        return [vscode.TextEdit.replace(fullRange, formatted)];
      }
    }
  );
}

function registerAxonyxDefinitions(languageServer) {
  return vscode.languages.registerDefinitionProvider(
    { language: "ax", scheme: "file" },
    {
      async provideDefinition(document, position) {
        if (!languageServer.running) return null;
        try {
          return await languageServer.definition(document, position);
        } catch (_error) {
          return null;
        }
      },
    },
  );
}

function formatAxonyx(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const formatted = [];
  let indent = 0;
  let previousBlank = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (!previousBlank && formatted.length > 0) {
        formatted.push("");
        previousBlank = true;
      }
      continue;
    }

    const currentIndent = Math.max(indent - leadingCloseDepth(trimmed), 0);
    formatted.push(`${"  ".repeat(currentIndent)}${trimmed}`);
    previousBlank = false;
    indent = Math.max(currentIndent + netOpenDepth(trimmed), 0);
  }

  while (formatted.length > 0 && formatted[formatted.length - 1] === "") {
    formatted.pop();
  }

  return `${formatted.join("\n")}\n`;
}

function leadingCloseDepth(line) {
  if (/^(<\/|}|]|\))/.test(line)) {
    return 1;
  }
  return 0;
}

function netOpenDepth(line) {
  if (line.startsWith("//")) {
    return 0;
  }

  let depth = 0;
  depth += countStructuralChar(line, "{") - countStructuralChar(line, "}");
  depth += countStructuralChar(line, "[") - countStructuralChar(line, "]");
  depth += countStructuralChar(line, "(") - countStructuralChar(line, ")");

  const tagOpen = line.match(/^<([A-Za-z][\w.:-]*)(?=\s|>|$)/);
  const closingTag = /^<\//.test(line);
  const selfClosingTag = /\/>\s*$/.test(line);
  const sameLineClose = tagOpen && new RegExp(`</${escapeRegExp(tagOpen[1])}>\\s*$`).test(line);
  if (tagOpen && !closingTag && !selfClosingTag && !sameLineClose) {
    depth += 1;
  }

  return depth;
}

function countStructuralChar(line, char) {
  let count = 0;
  let quote = null;
  let escaped = false;

  for (const current of line) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (current === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (current === quote) {
        quote = null;
      }
      continue;
    }
    if (current === "\"" || current === "'" || current === "`") {
      quote = current;
      continue;
    }
    if (current === char) {
      count += 1;
    }
  }

  return count;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class AxonyxLanguageServer {
  constructor(collection, output, fallbackRunner) {
    this.collection = collection;
    this.output = output;
    this.fallbackRunner = fallbackRunner;
    this.process = null;
    this.running = false;
    this.stopping = false;
    this.buffer = Buffer.alloc(0);
    this.nextRequestId = 1;
    this.pendingRequests = new Map();
  }

  async start() {
    const config = vscode.workspace.getConfiguration("axonyx");
    if (!config.get("languageServer.enabled", true)) {
      this.output.appendLine("[lsp] disabled by axonyx.languageServer.enabled");
      return false;
    }

    const command = resolveLanguageServerCommand();
    this.output.appendLine(`[lsp] starting ${command.command} ${command.args.join(" ")}`);
    this.stopping = false;

    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      try {
        this.process = cp.spawn(command.command, command.args, {
          cwd: command.cwd,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (error) {
        this.output.appendLine(`[lsp] failed to spawn: ${String(error.message || error)}`);
        settle(false);
        return;
      }

      this.process.stdout.on("data", (chunk) => this.acceptOutput(chunk));
      this.process.stderr.on("data", (chunk) => {
        const message = chunk.toString().trimEnd();
        if (message) this.output.appendLine(`[lsp] ${message}`);
      });
      this.process.once("error", (error) => {
        this.output.appendLine(`[lsp] process error: ${String(error.message || error)}`);
        this.rejectPending(error);
        this.process = null;
        this.running = false;
        settle(false);
      });
      this.process.once("close", (code) => {
        const wasRunning = this.running;
        this.running = false;
        this.process = null;
        this.rejectPending(new Error(`axonyx-lsp exited with code ${code}`));
        if (wasRunning && !this.stopping) {
          this.output.appendLine(`[lsp] exited unexpectedly with code ${code}; using CLI fallback`);
          vscode.window.showWarningMessage(
            "Axonyx language server stopped. Diagnostics will use the CLI fallback.",
          );
          for (const document of vscode.workspace.textDocuments) {
            this.fallbackRunner.validate(document);
          }
        }
        settle(false);
      });
      this.process.once("spawn", async () => {
        try {
          await this.request(
            "initialize",
            {
              processId: process.pid,
              rootUri: workspaceRootUri(),
              capabilities: {
                general: { positionEncodings: ["utf-16"] },
                textDocument: {
                  synchronization: { dynamicRegistration: false },
                  formatting: { dynamicRegistration: false },
                },
              },
            },
            120000,
          );
          this.running = true;
          this.notify("initialized", {});
          this.output.appendLine("[lsp] axonyx-lsp is ready");
          settle(true);
        } catch (error) {
          this.output.appendLine(`[lsp] initialization failed: ${String(error.message || error)}`);
          this.stop();
          settle(false);
        }
      });
    });
  }

  open(document) {
    if (!this.running || !isAxonyxDocument(document)) return;
    this.notify("textDocument/didOpen", {
      textDocument: {
        uri: document.uri.toString(),
        languageId: "ax",
        version: document.version,
        text: document.getText(),
      },
    });
  }

  change(document) {
    if (!this.running || !isAxonyxDocument(document)) return;
    this.notify("textDocument/didChange", {
      textDocument: { uri: document.uri.toString(), version: document.version },
      contentChanges: [{ text: document.getText() }],
    });
  }

  close(document) {
    if (!this.running || !isAxonyxDocument(document)) return;
    this.notify("textDocument/didClose", {
      textDocument: { uri: document.uri.toString() },
    });
  }

  async format(document) {
    if (!this.running || !isAxonyxDocument(document)) return null;
    const edits = await this.request("textDocument/formatting", {
      textDocument: { uri: document.uri.toString() },
      options: { tabSize: 2, insertSpaces: true },
    });
    if (!Array.isArray(edits)) return [];

    return edits.map((edit) => {
      const range = new vscode.Range(
        edit.range.start.line,
        edit.range.start.character,
        edit.range.end.line,
        edit.range.end.character,
      );
      return vscode.TextEdit.replace(range, edit.newText);
    });
  }

  async definition(document, position) {
    if (!this.running || !isAxonyxDocument(document)) return null;
    const location = await this.request("textDocument/definition", {
      textDocument: { uri: document.uri.toString() },
      position: { line: position.line, character: position.character },
    });
    if (!location || !location.uri || !location.range) return null;

    const range = new vscode.Range(
      location.range.start.line,
      location.range.start.character,
      location.range.end.line,
      location.range.end.character,
    );
    return new vscode.Location(vscode.Uri.parse(location.uri), range);
  }

  async completion(document, position) {
    if (!this.running || !isAxonyxDocument(document)) return null;
    const items = await this.request("textDocument/completion", {
      textDocument: { uri: document.uri.toString() },
      position: { line: position.line, character: position.character },
    });
    if (!Array.isArray(items)) return [];

    return items.map((source) => {
      const item = new vscode.CompletionItem(
        source.label,
        mapLspCompletionKind(source.kind),
      );
      if (source.detail) item.detail = source.detail;
      if (source.documentation) {
        const value = typeof source.documentation === "string"
          ? source.documentation
          : source.documentation.value;
        if (value) item.documentation = new vscode.MarkdownString(value);
      }
      if (source.sortText) item.sortText = source.sortText;
      if (source.filterText) item.filterText = source.filterText;
      if (source.textEdit && source.textEdit.range) {
        const range = new vscode.Range(
          source.textEdit.range.start.line,
          source.textEdit.range.start.character,
          source.textEdit.range.end.line,
          source.textEdit.range.end.character,
        );
        item.textEdit = vscode.TextEdit.replace(range, source.textEdit.newText);
      } else if (source.insertText) {
        item.insertText = source.insertText;
      }
      return item;
    });
  }

  async hover(document, position) {
    if (!this.running || !isAxonyxDocument(document)) return null;
    const source = await this.request("textDocument/hover", {
      textDocument: { uri: document.uri.toString() },
      position: { line: position.line, character: position.character },
    });
    if (!source || !source.contents) return null;

    const value = typeof source.contents === "string"
      ? source.contents
      : source.contents.value;
    if (!value) return null;
    const range = source.range
      ? new vscode.Range(
          source.range.start.line,
          source.range.start.character,
          source.range.end.line,
          source.range.end.character,
        )
      : undefined;
    return new vscode.Hover(new vscode.MarkdownString(value), range);
  }

  async stop() {
    if (!this.process) return;
    this.stopping = true;
    const child = this.process;
    if (this.running) {
      try {
        await this.request("shutdown", null, 1500);
        this.notify("exit");
      } catch (_error) {
        child.kill();
      }
    } else {
      child.kill();
    }
    this.running = false;
  }

  request(method, params, timeoutMs = 10000) {
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`axonyx-lsp request timed out: ${method}`));
      }, timeoutMs);
      this.pendingRequests.set(id, { resolve, reject, timer });
      try {
        this.send({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  notify(method, params) {
    const message = { jsonrpc: "2.0", method };
    if (params !== undefined) message.params = params;
    this.send(message);
  }

  send(message) {
    if (!this.process || !this.process.stdin.writable) {
      throw new Error("axonyx-lsp is not writable");
    }
    const body = Buffer.from(JSON.stringify(message), "utf8");
    this.process.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.process.stdin.write(body);
  }

  acceptOutput(chunk) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.subarray(0, headerEnd).toString("ascii");
      const match = header.match(/(?:^|\r\n)Content-Length:\s*(\d+)/i);
      if (!match) {
        this.output.appendLine("[lsp] discarded response without Content-Length");
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (this.buffer.length < bodyEnd) return;

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      this.buffer = this.buffer.subarray(bodyEnd);
      try {
        this.handleMessage(JSON.parse(body));
      } catch (error) {
        this.output.appendLine(`[lsp] invalid response: ${String(error.message || error)}`);
      }
    }
  }

  handleMessage(message) {
    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message || "axonyx-lsp request failed"));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (message.method === "textDocument/publishDiagnostics") {
      this.publishDiagnostics(message.params || {});
    }
  }

  publishDiagnostics(params) {
    if (!params.uri || !Array.isArray(params.diagnostics)) return;
    const uri = vscode.Uri.parse(params.uri);
    const diagnostics = params.diagnostics.map((diagnostic) => {
      const range = new vscode.Range(
        diagnostic.range.start.line,
        diagnostic.range.start.character,
        diagnostic.range.end.line,
        diagnostic.range.end.character,
      );
      const item = new vscode.Diagnostic(
        range,
        diagnostic.message,
        mapLspSeverity(diagnostic.severity),
      );
      item.source = diagnostic.source || "axonyx";
      item.code = diagnostic.code;
      return item;
    });
    const document = vscode.workspace.textDocuments.find(
      (candidate) => candidate.uri.toString() === uri.toString(),
    );
    if (document) diagnostics.push(...getLocalValueDiagnostics(document));
    this.collection.set(uri, diagnostics);
  }

  rejectPending(error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

function isAxonyxDocument(document) {
  return document.languageId === "ax" && document.uri.scheme === "file";
}

function workspaceRootUri() {
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  return folder ? folder.uri.toString() : null;
}

function mapLspSeverity(severity) {
  switch (severity) {
    case 2:
      return vscode.DiagnosticSeverity.Warning;
    case 3:
      return vscode.DiagnosticSeverity.Information;
    case 4:
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Error;
  }
}

function mapLspCompletionKind(kind) {
  switch (kind) {
    case 3:
      return vscode.CompletionItemKind.Function;
    case 7:
      return vscode.CompletionItemKind.Class;
    case 9:
      return vscode.CompletionItemKind.Module;
    case 18:
      return vscode.CompletionItemKind.Reference;
    case 22:
      return vscode.CompletionItemKind.Struct;
    default:
      return vscode.CompletionItemKind.Text;
  }
}

function resolveLanguageServerCommand() {
  const config = vscode.workspace.getConfiguration("axonyx");
  const configuredPath = String(config.get("languageServer.path", "")).trim();
  const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
  if (configuredPath) {
    return { command: configuredPath, args: [], cwd };
  }

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
        "axonyx-lsp",
        "--",
      ],
      cwd,
    };
  }

  return { command: "axonyx-lsp", args: [], cwd };
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

async function runAxFormat(document) {
  const command = resolveFormatCommand(document.uri.fsPath);
  const { stdout, stderr, exitCode } = await execFile(command.command, command.args, {
    cwd: command.cwd,
  });
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || "Axonyx formatter failed.");
  }
  return stdout;
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

function resolveFormatCommand(filePath) {
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
        "fmt",
        "--file",
        filePath,
        "--stdout",
      ],
      cwd,
    };
  }

  return {
    command: "cargo",
    args: ["ax", "fmt", "--file", filePath, "--stdout"],
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
  formatAxonyx,
  AxonyxLanguageServer,
};
