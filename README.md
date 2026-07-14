# Axonyx VS Code Extension

Syntax highlighting, snippets, diagnostics, and basic formatting for Axonyx `.ax` files.

## MVP Scope

This version focuses on making modern Pages ASX files readable and pleasant in VS Code:

- Pages ASX V1 declarations such as `page Home() { return ASX { ... } }`
- `component`, `scope`, `query`, `action`, `guard`, `state`, `data`, `type`, and `interface`
- `import ... from`
- JSX-like tags such as `<Head>`, `<SectionCard>`, `<Slot />`
- strings, numbers, booleans, attributes, and embedded `{expression}` blocks
- starter snippets for pages, data pages, components, scopes, queries, actions, imports, `Head`, `Each`, `If`, `Slot`, routes, and common Foundry UI blocks such as `SectionCard`, `HeroCard`, `ContentGrid`, `SiteShell`, and `Copy`
- newer Foundry snippets for `Form`, `FormGroup`, `Fieldset`, `Table`, `TableHead`, `TableCell`, `PaginationItem`, and layout primitives
- parser-backed diagnostics through `cargo ax check` on open/save
- basic document formatting through `Format Document` or `Axonyx: Format Document`

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
3. Open any `.ax` file.

If you are working inside the Axonyx repo family, the extension also looks for a local sibling `axonyx-framework` checkout and can run diagnostics through that source tree.

For published CLI diagnostics, install the current beta CLI:

```bash
cargo install cargo-axonyx --version 0.1.85 --force
```

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

## Next Good Steps

- faster background diagnostics with a persistent checker process
- `axonyx-lsp` as a Rust language server behind the extension
- go-to-definition for local and `@axonyx/ui/...` imports
- semantic formatting powered by the future `axonyx-lsp`
