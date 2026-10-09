/**
 * @file SAWScript grammar for tree-sitter
 * @license MIT
 *
 * This grammar closely follows SAW's own Happy grammar
 * (saw-script/src/SAWScript/Parser.y in GaloisInc/saw-script), so that it
 * accepts the same language.  Comments of the form `// Parser.y: Foo` name
 * the corresponding Happy nonterminal.
 *
 * Cryptol code blocks (`{{ ... }}`) and Cryptol type blocks (`{| ... |}`),
 * as well as block comments, are lexed by the external scanner in
 * src/scanner.c, following saw-script/src/SAWScript/Lexer.x.  Their
 * contents can be parsed with tree-sitter-cryptol via language injection
 * (see queries/injections.scm).
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const sep1 = (rule, sep) => seq(rule, repeat(seq(sep, rule)));
const commaSep1 = (rule) => sep1(rule, ',');

// Parser.y: commas2
const commaSep2 = (rule) => seq(rule, repeat1(seq(',', rule)));

// Lexer.x: @reservedid
const RESERVED = [
  'import', 'submodule', 'include', 'include_once', 'and', 'let', 'rec', 'in',
  'do', 'if', 'then', 'else', 'as', 'hiding', 'typedef', 'rebindable',
  'ProofScript', 'TopLevel', 'CrucibleSetup',
  'Int', 'String', 'Term', 'Type', 'Bool', 'AIG', 'CFG',
  'LLVMSpec', 'JVMMethodSpec', 'JVMSpec', 'MIRSpec',
];

export default grammar({
  name: 'saw_script',

  externals: $ => [
    '{{',
    '}}',
    '{|',
    '|}',
    $._cryptol_code_content,
    $._cryptol_type_content,
    $.block_comment,
    // Never produced; valid only during error recovery.
    $._error_sentinel,
  ],

  extras: $ => [/[ \t\r\f\v\n]/, $.line_comment, $.block_comment],

  word: $ => $.identifier,

  reserved: {
    global: _ => RESERVED,
  },

  conflicts: $ => [
  ],

  rules: {
    // Parser.y: StmtsSemiEOF
    source_file: $ => repeat(seq($._statement, ';')),

    // Parser.y: Stmt
    _statement: $ => choice(
      $.expression_statement,
      $.bind_statement,
      $.let_statement,
      $.rec_statement,
      $.code_statement,
      $.import_statement,
      $.include_statement,
      $.typedef_statement,
    ),

    expression_statement: $ => $._expression,

    bind_statement: $ => seq(
      field('pattern', $._aexpr),
      '<-',
      field('value', $._expression),
    ),

    let_statement: $ => seq(
      'let',
      optional('rebindable'),
      $.declaration,
    ),

    rec_statement: $ => seq('rec', sep1($.declaration, 'and')),

    code_statement: $ => seq('let', $.cryptol_code),

    import_statement: $ => seq(
      'import',
      optional('submodule'),
      choice(
        field('module', $._module_name),
        seq('`', field('module', $._module_name)),
        seq(
          field('module', $._module_name),
          '{', field('parameter', $.identifier), '}',
        ),
      ),
      optional(seq('as', field('alias', $.qualified_name))),
      optional(field('list', $.import_list)),
    ),

    // Parser.y: MName
    _module_name: $ => choice($.string, $.qualified_name),

    // Parser.y: QName
    qualified_name: $ => sep1($.identifier, '::'),

    // Parser.y: mbImportSpec
    import_list: $ => seq(
      optional('hiding'),
      '(',
      optional(commaSep1($.identifier)),
      ')',
    ),

    include_statement: $ => seq(
      choice('include', 'include_once'),
      field('path', $.string),
    ),

    typedef_statement: $ => seq(
      'typedef',
      field('name', $.identifier),
      '=',
      field('type', $._type),
    ),

    // ------------------------------------------------------------------------
    // Declarations and patterns

    // Parser.y: Declaration
    declaration: $ => seq(
      field('pattern', $._plain_pattern),
      repeat(field('parameter', $._plain_parameter)),
      optional(seq(':', field('type', $._type))),
      '=',
      field('body', $._expression),
    ),

    // Parser.y: ParamName
    named_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq('@', field('pattern', $._plain_pattern))),
      '?',
      '=',
      field('default', $._aexpr),
    ),

    // Parser.y: TypedParam
    _typed_parameter: $ => choice(
      $.named_parameter,
      alias($._typed_named_parameter, $.typed_parameter),
    ),

    _typed_named_parameter: $ => seq(
      field('parameter', $.named_parameter),
      ':',
      field('type', $._type),
    ),

    // Parser.y: PlainParam
    _plain_parameter: $ => choice(
      $.named_parameter,
      alias($._parenthesized_parameter, $.parenthesized_parameter),
      $._plain_pattern,
    ),

    _parenthesized_parameter: $ => seq('(', $._typed_parameter, ')'),

    // Parser.y: TypedPattern
    _typed_pattern: $ => choice(
      $._plain_pattern,
      $.typed_pattern,
    ),

    typed_pattern: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // Parser.y: PlainPattern
    _plain_pattern: $ => choice(
      $.identifier,
      $.tuple_pattern,
    ),

    tuple_pattern: $ => seq(
      '(',
      optional(commaSep1($._typed_pattern)),
      ')',
    ),

    // ------------------------------------------------------------------------
    // Expressions

    // Parser.y: Expression
    _expression: $ => choice(
      $._iexpr,
      $.typed_expression,
      $.lambda,
      $.let_expression,
      $.rec_expression,
      $.if_expression,
    ),

    typed_expression: $ => seq(
      field('expression', $._iexpr),
      ':',
      field('type', $._type),
    ),

    lambda: $ => seq(
      '\\',
      repeat1(field('parameter', $._plain_parameter)),
      '->',
      field('body', $._expression),
    ),

    let_expression: $ => seq(
      'let',
      $.declaration,
      'in',
      field('body', $._expression),
    ),

    rec_expression: $ => seq(
      'rec',
      sep1($.declaration, 'and'),
      'in',
      field('body', $._expression),
    ),

    if_expression: $ => seq(
      'if',
      field('condition', $._expression),
      'then',
      field('consequence', $._expression),
      'else',
      field('alternative', $._expression),
    ),

    // Parser.y: IExpr, Arguments
    _iexpr: $ => choice($._aexpr, $.application),

    application: $ => seq(
      field('function', $._aexpr),
      repeat1(field('argument', $._argument)),
    ),

    // Parser.y: ArgumentExpr
    _argument: $ => choice(
      $._aexpr,
      $.named_argument,
      alias($._parenthesized_named_argument, $.named_argument),
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._aexpr),
    ),

    _parenthesized_named_argument: $ => seq(
      '(',
      field('name', $.identifier),
      '=',
      field('value', $._expression),
      ')',
    ),

    // Parser.y: AExpr
    _aexpr: $ => choice(
      $.identifier,
      $.number,
      $.string,
      $.cryptol_code,
      $.cryptol_type,
      $.parenthesized_expression,
      $.tuple,
      $.list,
      $.record,
      $.do_block,
      $.field_access,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple: $ => seq(
      '(',
      optional(commaSep2($._expression)),
      ')',
    ),

    list: $ => seq('[', optional(commaSep1($._expression)), ']'),

    record: $ => seq('{', commaSep1($.field), '}'),

    // Parser.y: Field
    field: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
    ),

    do_block: $ => seq(
      'do',
      '{',
      repeat(seq($._statement, ';')),
      '}',
    ),

    field_access: $ => seq(
      field('value', $._aexpr),
      '.',
      field('field', choice($.identifier, $.number)),
    ),

    // Cryptol code and types.  The contents are parsed as Cryptol by
    // injection (see queries/injections.scm).

    cryptol_code: $ => seq(
      '{{',
      optional(alias($._cryptol_code_content, $.cryptol_content)),
      '}}',
    ),

    cryptol_type: $ => seq(
      '{|',
      optional(alias($._cryptol_type_content, $.cryptol_content)),
      '|}',
    ),

    // ------------------------------------------------------------------------
    // Types

    // Parser.y: Type, FunctionType
    _type: $ => choice($._applied_type, $.function_type),

    function_type: $ => seq(
      optional(seq(field('name', $.identifier), '?')),
      field('parameter', $._applied_type),
      '->',
      field('result', $._type),
    ),

    // Parser.y: AppliedType
    _applied_type: $ => choice($._base_type, $.type_application),

    type_application: $ => seq(
      field('constructor', $._base_type),
      repeat1(field('argument', $._base_type)),
    ),

    // Parser.y: BaseType
    _base_type: $ => choice(
      $.identifier,
      $.builtin_type,
      $.tuple_type,
      $.parenthesized_type,
      $.list_type,
      $.record_type,
    ),

    builtin_type: _ => choice(
      'Bool', 'Int', 'String', 'Term', 'Type', 'AIG', 'CFG',
      'LLVMSpec', 'JVMMethodSpec', 'JVMSpec', 'MIRSpec',
      'ProofScript', 'TopLevel', 'CrucibleSetup',
    ),

    tuple_type: $ => seq('(', optional(commaSep2($._type)), ')'),

    parenthesized_type: $ => seq('(', $._type, ')'),

    list_type: $ => seq('[', $._type, ']'),

    record_type: $ => seq('{', commaSep1($.field_type), '}'),

    // Parser.y: FieldType
    field_type: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // ------------------------------------------------------------------------
    // Tokens

    // Lexer.x: @varid
    identifier: _ => /[\p{Lu}\p{Lt}\p{Ll}\p{Lo}_][\p{Lu}\p{Lt}\p{Ll}\p{Lo}\p{Nd}\p{No}\p{Pf}_']*/u,

    // Lexer.x: @num
    number: _ => token(choice(
      /[0-9]+/,
      /0[bB][01]+/,
      /0[oO][0-7]+/,
      /0[xX][0-9a-fA-F]+/,
    )),

    // Lexer.x: <string>
    string: _ => token(seq(
      '"',
      repeat(choice(
        /[^"\\\n\t]/,
        // Escapes
        /\\[abfnrtv\\"'&]/,
        /\\\^[A-Z@\[\\\]\^_]/,
        /\\(NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL)/,
        /\\[0-9]+/,
        /\\o[0-7]+/,
        /\\x[0-9a-fA-F]+/,
        // Gaps
        /\\[ \t\r\f\v\n]+\\/,
      )),
      '"',
    )),

    line_comment: _ => token(seq('//', /[^\n]*/)),
  },
});
