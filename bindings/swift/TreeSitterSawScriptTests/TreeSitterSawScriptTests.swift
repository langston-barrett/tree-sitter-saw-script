import XCTest
import SwiftTreeSitter
import TreeSitterSawScript

final class TreeSitterSawScriptTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_saw_script())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading SAWScript grammar")
    }
}
