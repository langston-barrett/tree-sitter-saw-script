#!/usr/bin/env bash
# Vendor SAWScript's lexer and parser (and the modules they depend on) from a
# saw-script checkout into oracle/vendor/.
#
# Usage: oracle/vendor.sh SAW_SCRIPT_CHECKOUT
#
# Only two modules are not copied verbatim, to avoid building all of SAW:
#   - SAWCentral.Utils, which the parser imports but does not use, and which
#     depends on a JVM library, is replaced by an empty module;
#   - SAWVersion.GitRev, which is generated at build time, is stubbed.
set -euo pipefail

saw=$(cd "$1" && pwd)
here=$(cd "$(dirname "$0")" && pwd)
dest=$here/vendor
rm -rf "$dest"
mkdir -p "$dest/src"

copy() {
  mkdir -p "$(dirname "$dest/src/$2")"
  cp "$saw/$1/src/$2" "$dest/src/$2"
}
copy saw-script SAWScript/Lexer.x
copy saw-script SAWScript/Parser.y
copy saw-script SAWScript/Token.hs
copy saw-script SAWScript/Panic.hs
copy saw-central SAWCentral/AST.hs
copy saw-central SAWCentral/Options.hs
copy saw-central SAWCentral/Panic.hs
copy saw-central SAWCentral/Position.hs
copy saw-support SAWSupport/ConsoleSupport.hs
copy saw-support SAWSupport/PanicSupport.hs
copy saw-support SAWSupport/Position.hs
copy saw-support SAWSupport/Pretty.hs
cp "$saw/LICENSE" "$dest/LICENSE"

cat > "$dest/src/SAWCentral/Utils.hs" <<'HS'
-- Stub: the SAWScript lexer and parser import this module but use nothing
-- from it.  (The real module depends on a JVM library.)
module SAWCentral.Utils () where
HS

mkdir -p "$dest/src/SAWVersion"
cat > "$dest/src/SAWVersion/GitRev.hs" <<'HS'
{-# LANGUAGE Safe #-}
-- Stub for the module that SAW generates at build time.
module SAWVersion.GitRev (foundGit, hash, branch) where

foundGit :: Bool
foundGit = False

hash :: Maybe String
hash = Nothing

branch :: Maybe String
branch = Nothing
HS

git -C "$saw" rev-parse HEAD > "$dest/COMMIT"
echo "Vendored saw-script $(cat "$dest/COMMIT")" >&2
