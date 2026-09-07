# Axonyx VS Code Extension

Syntax highlighting, snippets, diagnostics, and basic formatting for Axonyx
`.asx` frontend files and `.ax` backend files.

## MVP Scope

This version focuses on making modern Pages ASX files readable and pleasant in VS Code:

- Pages V2 declarations such as `page Home() { return ASX { ... } }`
- `component`, `scope`, `query`, `action`, `guard`, `state`, `data`, `type`, and `interface`
- `import ... from`
- JSX-like tags such as `<Head>`, `<SectionCard>`, `<Slot />`
- strings, numbers, booleans, attributes, and embedded `{expression}` blocks
- starter snippets for pages, data pages, components, scopes, queries, actions, imports, `Head`, `Each`, `If`, `Slot`, routes, and common Foundry UI blocks such as `SectionCard`, `HeroCard`, `ContentGrid`, `SiteShell`, and `Copy`
- newer Foundry snippets for `Form`, `FormGroup`, `Fieldset`, `Table`, `TableHead`, `TableCell`, `PaginationItem`, and layout primitives
- persistent parser-backed diagnostics through `axonyx-lsp` on open/change
- compiler-owned formatting through `axonyx-lsp`, with a CLI fallback
- distinct highlighting for typed props/parameters, bindings, function calls,
  runtime scopes, operators, and ASX component/HTML tags

Example:

```ax
page Home() {
  data posts: List<Post> = loadPosts("published")

  return ASX {
    <Container max="xl">
      <Each items={posts} as="post">
        <Card title={post.title}>
          <Copy>{post.excerpt}</Copy>
        </Card>
      </Each>
    </Container>
  }
}
```

## Local Development

1. Open this folder in VS Code.
2. Run `Developer: Install Extension from Location...` and choose this repo folder.
3. Open any `.asx` page/component or `.ax` backend file.

If you are working inside the Axonyx repo family, the extension looks for a
local sibling `axonyx-framework` checkout and launches its `axonyx-lsp` binary
through Cargo. Otherwise it looks for `axonyx-lsp` on `PATH`.

For published CLI diagnostics, install the current beta CLI:

```bash
cargo install cargo-axonyx --force
```

Until `axonyx-lsp` is published, contributors can install it from a framework
checkout:

```bash
cargo install --path crates/axonyx-lsp
```

Use `axonyx.languageServer.path` to select an explicit binary, or set
`axonyx.languageServer.enabled` to `false` to use the CLI diagnostics fallback.

To format on save, enable VS Code formatting for Axonyx files:

```json
{
  "[ax]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "vladanpro.axonyx-vscode"
  }
}
```

Alternative dev flow:

1. Install `vsce` if needed: `npm install -g @vscode/vsce`
2. Package the extension: `vsce package`
3. Install the generated `.vsix` in VS Code.

## Language Server Support

- persistent parser and workspace import diagnostics
- compiler-owned formatting and symbol-aware go-to-definition
- compiler-owned hover for local, imported, aliased, and namespace symbols
- completion for local declarations, imported components, and namespace members
- lightweight Foundry prop/value suggestions when the language server has no result

Next: precise parser spans, documentation comments, prop-contract completion,
and workspace-wide references.
