const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const textmate = require("vscode-textmate");
const oniguruma = require("vscode-oniguruma");

const root = path.resolve(__dirname, "..");
const wasm = fs.readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm"));

async function loadGrammar() {
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (value) => new oniguruma.OnigString(value),
    }),
    loadGrammar: async (scopeName) => {
      if (scopeName !== "source.ax") return null;
      const file = path.join(root, "syntaxes", "ax.tmLanguage.json");
      return textmate.parseRawGrammar(fs.readFileSync(file, "utf8"), file);
    },
  });
  return registry.loadGrammar("source.ax");
}

function scopesAt(line, tokens, needle) {
  const index = line.indexOf(needle);
  assert.notEqual(index, -1, `missing fixture text: ${needle}`);
  const token = tokens.find(({ startIndex, endIndex }) => startIndex <= index && index < endIndex);
  assert.ok(token, `missing token for ${needle}`);
  return token.scopes;
}

async function main() {
  const grammar = await loadGrammar();
  const lines = [
    "page AlertComponent() {",
    "  return ASX {",
    "    <Container max=\"xl\">",
    "      <Card title=\"Alert\">",
    "        <Copy tone=\"lead\">Status feedback.</Copy>",
    "      </Card>",
    "      <Grid cols={2} gap=\"lg\">",
    "        <Alert tone=\"info\" title=\"Info\">Ready.</Alert>",
    "      </Grid>",
    "    </Container>",
    "  }",
    "}",
  ];
  let stack = textmate.INITIAL;
  const tokenized = lines.map((line) => {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    return result.tokens;
  });

  for (const [lineIndex, tag] of [[2, "Container"], [3, "Card"], [4, "Copy"], [6, "Grid"], [7, "Alert"], [9, "Container"]]) {
    const scopes = scopesAt(lines[lineIndex], tokenized[lineIndex], tag);
    assert.ok(scopes.includes("support.class.component"), `${tag} was not highlighted: ${scopes}`);
    assert.ok(!scopes.includes("meta.embedded.expression.ax"), `${tag} is inside an expression`);
  }
  assert.ok(scopesAt(lines[6], tokenized[6], "2").includes("constant.numeric.ax"));
  assert.ok(scopesAt(lines[0], tokenized[0], "{").includes("punctuation.section.block.begin.ax"));
  assert.ok(scopesAt(lines[1], tokenized[1], "{").includes("punctuation.section.block.begin.ax"));

  const compact = ["component Label {", "  return ASX { <Copy>Ready</Copy> }", "}"];
  stack = textmate.INITIAL;
  const compactTokens = compact.map((line) => {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    return result.tokens;
  });
  assert.ok(scopesAt(compact[0], compactTokens[0], "{").includes("punctuation.section.block.begin.ax"));
  assert.ok(scopesAt(compact[1], compactTokens[1], "Copy").includes("support.class.component"));
  console.log("ASX syntax highlighting passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
