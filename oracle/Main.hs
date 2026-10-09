-- | Classify SAWScript source files using SAW's own lexer and parser
-- (vendored in vendor/, see vendor.sh).
--
-- For each file argument, prints one line:
--
-- > ok       FILE
-- > syntax   FILE<TAB>MESSAGE   (lexical or grammatical error)
-- > semantic FILE<TAB>MESSAGE   (rejected by a check in the parser's actions)
--
-- Only files labelled @syntax@ are expected to be rejected by tree-sitter.
module Main (main) where

import Control.Exception (SomeException, displayException, evaluate, try)
import qualified Data.ByteString as BS
import qualified Data.Text as T
import qualified Data.Text.Encoding as T
import System.Environment (getArgs)

import SAWScript.Lexer (lexSAW)
import SAWScript.Parser (ParseError(..), parseModule, prettyParseError)

main :: IO ()
main = mapM_ classify =<< getArgs

classify :: FilePath -> IO ()
classify path =
  do bytes <- try (BS.readFile path)
     case bytes of
       Left e -> report "error   " (displayException (e :: SomeException))
       Right bs ->
         case T.decodeUtf8' bs of
           Left _ -> report "syntax  " "invalid UTF-8"
           Right src ->
             do -- The lexer panics if no token matches.
                result <- try (evaluate (forceResult (classifyText path src)))
                case result of
                  Left e -> report "syntax  " (oneLine (displayException (e :: SomeException)))
                  Right (label, msg) -> report label msg
  where
  report label msg = putStrLn (label ++ " " ++ path ++ "\t" ++ msg)
  forceResult r@(label, msg) = length label `seq` length msg `seq` r

classifyText :: FilePath -> T.Text -> (String, String)
classifyText path src =
  case lexSAW path eofName src of
    Left (_, _, msg) -> ("syntax  ", oneLine (T.unpack msg))
    Right (toks, _) ->
      case parseModule toks of
        Right _ -> ("ok      ", "")
        Left err ->
          let label = case err of
                        HappyError {} -> "syntax  "
                        _ -> "semantic"
          in (label, oneLine (show (snd (prettyParseError eofName err))))
  where
  eofName = T.pack "end-of-file"

oneLine :: String -> String
oneLine = unwords . words
