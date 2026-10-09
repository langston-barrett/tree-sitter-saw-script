/**
 * External scanner for SAWScript.
 *
 * This lexes the tokens of SAWScript that a regular expression cannot
 * describe, following saw-script/src/SAWScript/Lexer.x in
 * GaloisInc/saw-script:
 *
 *  - Block comments, which nest.
 *  - Cryptol code blocks `{{ ... }}` and Cryptol type blocks `{| ... |}`.
 *    Their contents are opaque, except that comments inside them are
 *    recognized (so a `}}` inside a comment does not end a code block).
 *
 * The delimiters and the contents of Cryptol blocks are separate tokens, so
 * that the contents can be parsed as Cryptol by injection.  SAW's lexer
 * recognizes `{{` and `{|` wherever they occur, so this scanner produces
 * these tokens whether or not the parser expects them.
 */

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

enum TokenType {
  CODE_OPEN,
  CODE_CLOSE,
  TYPE_OPEN,
  TYPE_CLOSE,
  CODE_CONTENT,
  TYPE_CONTENT,
  BLOCK_COMMENT,
  ERROR_SENTINEL,
};

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static bool is_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\r' || c == '\f' || c == '\v' ||
         c == '\n';
}

// Advance past the rest of a block comment whose opening `/*` has been
// consumed.  Block comments nest.  Returns false at the end of the input,
// where SAW reports an unclosed comment.
static bool finish_block_comment(TSLexer *lexer) {
  unsigned depth = 1;
  while (depth > 0) {
    if (lexer->eof(lexer)) {
      return false;
    }
    if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '*') {
        advance(lexer);
        depth++;
      }
    } else if (lexer->lookahead == '*') {
      while (lexer->lookahead == '*') {
        advance(lexer);
      }
      if (lexer->lookahead == '/') {
        advance(lexer);
        depth--;
      }
    } else {
      advance(lexer);
    }
  }
  return true;
}

// Lex the contents of a Cryptol block, up to (but not including) the closing
// `}}` or `|}`, whose first character is `close`.  Comments inside the block
// are skipped, so a closing delimiter inside a comment does not end the
// block.  If the contents are empty, lex the closing delimiter instead.
static bool scan_cryptol_content(TSLexer *lexer, int32_t close,
                                 enum TokenType content,
                                 enum TokenType close_token) {
  bool empty = true;
  for (;;) {
    lexer->mark_end(lexer);
    if (lexer->eof(lexer)) {
      break;
    }
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == close && lexer->lookahead == '}') {
      if (empty) {
        advance(lexer);
        lexer->mark_end(lexer);
        lexer->result_symbol = (TSSymbol)close_token;
        return true;
      }
      break;
    }
    empty = false;
    if (c == '/' && lexer->lookahead == '*') {
      advance(lexer);
      if (!finish_block_comment(lexer)) {
        lexer->mark_end(lexer);
        break;
      }
    } else if (c == '/' && lexer->lookahead == '/') {
      while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
        advance(lexer);
      }
    }
  }
  if (empty) {
    return false;
  }
  lexer->result_symbol = (TSSymbol)content;
  return true;
}

// Consume a two-character token and produce it.
static bool emit_pair(TSLexer *lexer, enum TokenType token) {
  advance(lexer);
  advance(lexer);
  lexer->mark_end(lexer);
  lexer->result_symbol = (TSSymbol)token;
  return true;
}

static bool scan(TSLexer *lexer, const bool *valid_symbols) {
  bool recovering = valid_symbols[ERROR_SENTINEL];

  // Contents and closing delimiters of Cryptol blocks.  These are valid only
  // just after an opening delimiter or the contents, respectively.
  if (!recovering) {
    // An empty block at the end of the input has no contents to lex.
    if (valid_symbols[CODE_CONTENT]) {
      return scan_cryptol_content(lexer, '}', CODE_CONTENT, CODE_CLOSE);
    }
    if (valid_symbols[TYPE_CONTENT]) {
      return scan_cryptol_content(lexer, '|', TYPE_CONTENT, TYPE_CLOSE);
    }
  }

  while (is_space(lexer->lookahead)) {
    skip(lexer);
  }
  lexer->mark_end(lexer);

  switch (lexer->lookahead) {
    case '/':
      advance(lexer);
      if (lexer->lookahead != '*') {
        return false;
      }
      advance(lexer);
      if (!finish_block_comment(lexer)) {
        return false;
      }
      lexer->mark_end(lexer);
      lexer->result_symbol = BLOCK_COMMENT;
      return true;
    case '{':
      advance(lexer);
      if (lexer->lookahead == '{') {
        advance(lexer);
        lexer->mark_end(lexer);
        lexer->result_symbol = CODE_OPEN;
        return true;
      }
      if (lexer->lookahead == '|') {
        advance(lexer);
        lexer->mark_end(lexer);
        lexer->result_symbol = TYPE_OPEN;
        return true;
      }
      return false;
    case '}':
      // Outside of Cryptol blocks, `}}` is two tokens (e.g., the ends of
      // nested records).
      if (!recovering && valid_symbols[CODE_CLOSE]) {
        return emit_pair(lexer, CODE_CLOSE);
      }
      return false;
    case '|':
      if (!recovering && valid_symbols[TYPE_CLOSE]) {
        return emit_pair(lexer, TYPE_CLOSE);
      }
      return false;
    default:
      return false;
  }
}

void *tree_sitter_saw_script_external_scanner_create(void) { return NULL; }

void tree_sitter_saw_script_external_scanner_destroy(void *payload) {
  (void)payload;
}

// The signature is fixed by tree-sitter, although this scanner has no state.
// NOLINTBEGIN(readability-non-const-parameter)
unsigned tree_sitter_saw_script_external_scanner_serialize(void *payload,
                                                           char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
// NOLINTEND(readability-non-const-parameter)

void tree_sitter_saw_script_external_scanner_deserialize(void *payload,
                                                         const char *buffer,
                                                         unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_saw_script_external_scanner_scan(void *payload, TSLexer *lexer,
                                                  const bool *valid_symbols) {
  (void)payload;
  return scan(lexer, valid_symbols);
}
