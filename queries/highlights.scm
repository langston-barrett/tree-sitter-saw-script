; Keywords

[
  "import"
  "submodule"
  "as"
  "hiding"
  "include"
  "include_once"
  "let"
  "rec"
  "and"
  "in"
  "rebindable"
  "typedef"
  "do"
] @keyword

[
  "if"
  "then"
  "else"
] @keyword.conditional

; Literals

(number) @number
(string) @string
(line_comment) @comment
(block_comment) @comment

; Cryptol blocks (their contents are injected)

[
  "{{"
  "}}"
  "{|"
  "|}"
] @punctuation.special

; Types

(builtin_type) @type.builtin
(type_application
  constructor: (identifier) @type)
(typedef_statement
  name: (identifier) @type.definition)
(field_type
  name: (identifier) @property)

; Functions and variables

(declaration
  pattern: (identifier) @function
  parameter: (_))
(declaration
  pattern: (identifier) @variable
  !parameter)
(application
  function: (identifier) @function.call)
(named_parameter
  name: (identifier) @variable.parameter)
(named_argument
  name: (identifier) @variable.parameter)
(lambda
  parameter: (identifier) @variable.parameter)
(declaration
  parameter: (identifier) @variable.parameter)
(field
  name: (identifier) @property)
(field_access
  field: (identifier) @property)

; Modules

(import_statement
  module: (qualified_name) @module)
(import_statement
  alias: (qualified_name) @module)

; Operators and punctuation

[
  "="
  "<-"
  "->"
  "\\"
  ":"
  "::"
  "?"
  "@"
  "."
  "`"
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ";"
] @punctuation.delimiter
