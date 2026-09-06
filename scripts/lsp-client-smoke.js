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

const collectionWrites = [];
const vscodeMock = {
  Diagnostic,
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
  Range,
  Uri: {
    parse(value) {
      return { toString: () => value };
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
