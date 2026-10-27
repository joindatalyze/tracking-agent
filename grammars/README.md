# Grammars

Tree-sitter grammars compiled to WebAssembly, read by `src/scan/native.ts` (through `web-tree-sitter`) to scan Swift, Kotlin and Dart. Copied from `tree-sitter-wasms` 0.1.13 so the package doesn't install all of its 51 MB.

| File | Grammar | Licence |
|---|---|---|
| `tree-sitter-swift.wasm` | alex-pinkus/tree-sitter-swift, npm `tree-sitter-swift` 0.4 (ABI 13) | MIT |
| `tree-sitter-kotlin.wasm` | fwcd/tree-sitter-kotlin, npm `tree-sitter-kotlin` 0.3 (ABI 14) | MIT |
| `tree-sitter-dart.wasm` | UserNobody14/tree-sitter-dart (ABI 15) | MIT |

The Kotlin grammar wants a newline after a one-line object's property (`object E { const val A = "a" }` parses with an error node, though the declaration is still read). They load with `web-tree-sitter` 0.25.10 (pinned in package.json). To update one, replace the file and run `npm test`: `test/scan-native.test.ts` parses every construct the scanner relies on.
