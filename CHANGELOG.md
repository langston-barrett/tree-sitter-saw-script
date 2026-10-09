# Changelog

## Unreleased

- The Cryptol declarations in `let {{ ... }}` are now a `cryptol_declarations`
  node, rather than `cryptol_code`.
- Inject tree-sitter-cryptol's `cryptol_expression` and `cryptol_type`
  grammars into `{{ ... }}` and `{| ... |}` blocks, and its `cryptol` grammar
  into `let {{ ... }}` blocks.
- The differential test now detects error recovery that inserts hidden
  tokens.

## [0.1.0] - 2026-10-09

Initial release.
