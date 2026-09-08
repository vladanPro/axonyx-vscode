"use strict";

const assert = require("assert");
const Module = require("module");

class Range {
  constructor(startLine, startCharacter, endLine, endCharacter) {
    this.start = { line: startLine, character: startCharacter };
    this.end = { line: endLine, character: endCharacter };
  }
}

class Diagnostic {
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
}

class CompletionItem {
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
  }
}

class MarkdownString {
  constructor(value) {
    this.value = value;
  }
}

class SnippetString {
  constructor(value) {
    this.value = value;
  }
}

class Hover {
  constructor(contents, range) {
    this.contents = contents;
    this.range = range;
  }
}

const collectionWrites = [];
const vscodeMock = {
  CompletionItem,
  CompletionItemKind: {
    Text: 0,
    Function: 2,
    Class: 6,
    Module: 8,
    Property: 9,
    Value: 11,
    Reference: 17,
    Struct: 21,
  },
  Diagnostic,
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  Hover,
  Location,
  MarkdownString,
  Range,
  SnippetString,
  TextEdit: {
    replace(range, newText) {
      return { range, newText };
    },
  },
  Uri: {
    parse(value) {
      return { value, toString: () => value };
    },
  },
  workspace: {
    textDocuments: [],
    getConfiguration() {
      return { get: (_name, fallback) => fallback };
    },
  },
  window: {
    showWarningMessage() {},
  },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "vscode") return vscodeMock;
  return originalLoad.call(this, request, parent, isMain);
};

const { AxonyxLanguageServer } = require("../extension.js");
Module._load = originalLoad;

function frame(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"),
    body,
  ]);
}

async function main() {
  const collection = {
    set(uri, diagnostics) {
      collectionWrites.push({ uri: uri.toString(), diagnostics });
    },
  };
  const output = { appendLine() {} };
  const fallback = { validate() {} };
  const client = new AxonyxLanguageServer(collection, output, fallback);

  const writes = [];
  client.process = {
    stdin: {
      writable: true,
      write(value) {
        writes.push(Buffer.from(value));
      },
    },
  };
  client.notify("axonyx/test", { value: "čelik" });
  const sent = Buffer.concat(writes);
  const separator = sent.indexOf("\r\n\r\n");
  const declaredLength = Number(
    sent.subarray(0, separator).toString("ascii").split(":")[1].trim(),
  );
  assert.strictEqual(declaredLength, sent.length - separator - 4);
  client.process = null;

  const response = new Promise((resolve, reject) => {
    client.pendingRequests.set(7, {
      resolve,
      reject,
      timer: setTimeout(() => reject(new Error("response timeout")), 1000),
    });
  });
  const responseFrame = frame({ jsonrpc: "2.0", id: 7, result: { ready: true } });
  client.acceptOutput(responseFrame.subarray(0, 9));
  client.acceptOutput(responseFrame.subarray(9, 31));
  client.acceptOutput(responseFrame.subarray(31));
  assert.deepStrictEqual(await response, { ready: true });

  const diagnosticFrame = frame({
    jsonrpc: "2.0",
    method: "textDocument/publishDiagnostics",
    params: {
      uri: "file:///workspace/app/page.asx",
      version: 3,
      diagnostics: [
        {
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 1 },
          },
          severity: 1,
          code: "axonyx-parse",
          source: "axonyx",
          message: "pogrešan tag",
        },
      ],
    },
  });
  for (let index = 0; index < diagnosticFrame.length; index += 3) {
    client.acceptOutput(diagnosticFrame.subarray(index, index + 3));
  }

  assert.strictEqual(collectionWrites.length, 1);
  assert.strictEqual(collectionWrites[0].diagnostics[0].message, "pogrešan tag");
  assert.strictEqual(collectionWrites[0].diagnostics[0].code, "axonyx-parse");
  assert.deepStrictEqual(collectionWrites[0].diagnostics[0].range.start, {
    line: 2,
    character: 0,
  });

  const definitionWrites = [];
  client.running = true;
  client.process = {
    stdin: {
      writable: true,
      write(value) {
        definitionWrites.push(Buffer.from(value));
      },
    },
  };
  const document = {
    languageId: "ax",
    uri: { scheme: "file", toString: () => "file:///workspace/app/page.asx" },
  };
  const definition = client.definition(document, { line: 0, character: 28 });
  assert.ok(Buffer.concat(definitionWrites).includes(Buffer.from("textDocument/definition")));
  client.acceptOutput(frame({
    jsonrpc: "2.0",
    id: 1,
    result: {
      uri: "file:///workspace/app/components/Card.asx",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  }));
  const location = await definition;
  assert.strictEqual(location.uri.toString(), "file:///workspace/app/components/Card.asx");
  assert.deepStrictEqual(location.range.start, { line: 0, character: 0 });

  const completionWrites = [];
  client.process.stdin.write = (value) => completionWrites.push(Buffer.from(value));
  const completion = client.completion(document, { line: 2, character: 33 });
  assert.ok(Buffer.concat(completionWrites).includes(Buffer.from("textDocument/completion")));
  client.acceptOutput(frame({
    jsonrpc: "2.0",
    id: 2,
    result: [{
      label: "Panel",
      kind: 7,
      detail: "component Card (imported from @/components/Card)",
      documentation: { kind: "markdown", value: "```ax\ncomponent Card\n```" },
      sortText: "1-panel",
      filterText: "Panel",
      textEdit: {
        range: {
          start: { line: 2, character: 30 },
          end: { line: 2, character: 33 },
        },
        newText: "Panel",
      },
    }],
  }));
  const completionItems = await completion;
  assert.strictEqual(completionItems.length, 1);
  assert.strictEqual(completionItems[0].label, "Panel");
  assert.strictEqual(completionItems[0].kind, vscodeMock.CompletionItemKind.Class);
  assert.strictEqual(completionItems[0].documentation.value, "```ax\ncomponent Card\n```");
  assert.strictEqual(completionItems[0].textEdit.newText, "Panel");
  assert.deepStrictEqual(completionItems[0].textEdit.range.start, { line: 2, character: 30 });

  const propCompletionWrites = [];
  client.process.stdin.write = (value) => propCompletionWrites.push(Buffer.from(value));
  const propCompletion = client.completion(document, { line: 3, character: 4 });
  assert.ok(Buffer.concat(propCompletionWrites).includes(Buffer.from("textDocument/completion")));
  client.acceptOutput(frame({
    jsonrpc: "2.0",
    id: 3,
    result: [{
      label: "variant",
      kind: 10,
      detail: "optional prop: variant: primary | ghost",
      insertTextFormat: 2,
      textEdit: {
        range: {
          start: { line: 3, character: 2 },
          end: { line: 3, character: 4 },
        },
        newText: "variant=\"$1\"",
      },
    }],
  }));
  const propCompletionItems = await propCompletion;
  assert.strictEqual(propCompletionItems.length, 1);
  assert.strictEqual(propCompletionItems[0].kind, vscodeMock.CompletionItemKind.Property);
  assert.strictEqual(propCompletionItems[0].insertText.value, "variant=\"$1\"");
  assert.deepStrictEqual(propCompletionItems[0].range.start, { line: 3, character: 2 });
  assert.strictEqual(propCompletionItems[0].textEdit, undefined);

  const hoverWrites = [];
  client.process.stdin.write = (value) => hoverWrites.push(Buffer.from(value));
  const hover = client.hover(document, { line: 2, character: 31 });
  assert.ok(Buffer.concat(hoverWrites).includes(Buffer.from("textDocument/hover")));
  client.acceptOutput(frame({
    jsonrpc: "2.0",
    id: 4,
    result: {
      contents: { kind: "markdown", value: "```ax\ncomponent Card\n```" },
      range: {
        start: { line: 2, character: 28 },
        end: { line: 2, character: 33 },
      },
    },
  }));
  const hoverResult = await hover;
  assert.strictEqual(hoverResult.contents.value, "```ax\ncomponent Card\n```");
  assert.deepStrictEqual(hoverResult.range.end, { line: 2, character: 33 });
  client.running = false;
  client.process = null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
