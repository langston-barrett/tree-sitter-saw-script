; Cryptol, parsed with tree-sitter-cryptol
; (https://github.com/langston-barrett/tree-sitter-cryptol), which provides
; grammars for Cryptol modules (declarations), expressions, and types.

((cryptol_declarations
  (cryptol_content) @injection.content)
  (#set! injection.language "cryptol"))

((cryptol_code
  (cryptol_content) @injection.content)
  (#set! injection.language "cryptol_expression"))

((cryptol_type
  (cryptol_content) @injection.content)
  (#set! injection.language "cryptol_type"))
