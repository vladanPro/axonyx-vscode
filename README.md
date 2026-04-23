# Axonyx VS Code Extension

Syntax highlighting and snippets for Axonyx `.ax` files.

## MVP Scope

This first version focuses on making `.ax` files readable in VS Code:

- `page`, `route`, `title`, `meta`, `link`, `theme`, `data`, `return`
- `import ... from`
- JSX-like tags such as `<Head>`, `<SectionCard>`, `<Slot />`
- indentation-first Axonyx syntax such as `Card title: "..."` and `Copy -> "..."`
- strings, numbers, booleans, attributes, and embedded `{expression}` blocks
- starter snippets for pages, imports, `Head`, `Each`, `If`, `Slot`, routes, and common Foundry UI blocks such as `SectionCard`, `HeroCard`, `ContentGrid`, `SiteShell`, and `Copy`

## Local Development

1. Open this folder in VS Code.
2. Run `Developer: Install Extension from Location...` and choose this repo folder.
3. Open any `.ax` file.

Alternative dev flow:

1. Install `vsce` if needed: `npm install -g @vscode/vsce`
2. Package the extension: `vsce package`
3. Install the generated `.vsix` in VS Code.

## Next Good Steps

- better scopes for `Each`, `If`, `Slot`, and future `override`
- diagnostics from the real Axonyx parser
- go-to-definition for local and `@axonyx/ui/...` imports
- formatter support
