# tree-sitter-saw-script

[Tree-sitter] parser for [SAWScript], the scripting language of [SAW].

Vibe-coded. Passes extensive SAWScript corpus, including positive and negative
tests.

Cryptol code is parsed with [tree-sitter-cryptol] via
[language injection](queries/injections.scm): `let {{ ... }}` declarations
with its `cryptol` grammar, `{{ ... }}` expressions with `cryptol_expr`,
and `{| ... |}` types with `cryptol_type`.

The grammar follows SAW's own parser. A [differential test](script/differential)
checks that tree-sitter accepts exactly the files that SAW's parser accepts,
over a corpus of SAWScript files from public repositories
([script/corpus.tsv](script/corpus.tsv)), including SAW's own tests of parse
errors.

[Tree-sitter]: https://tree-sitter.github.io/tree-sitter/
[SAWScript]: https://github.com/GaloisInc/saw-script/blob/master/doc/manual/manual.md
[SAW]: https://saw.galois.com/
[tree-sitter-cryptol]: https://github.com/langston-barrett/tree-sitter-cryptol
