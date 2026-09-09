# Spelling resources

The Wonboard application code is MIT. Third-party resources retain their own licenses.

- Korean dictionary: hunspell-dict-ko 0.7.94, https://github.com/spellcheck-ko/hunspell-dict-ko/releases/tag/0.7.94 . Unmodified ko.aff and ko.dic; GPLv3. License and source information: ko/LICENSE.md and ko/LICENSE.GPL-3. Corresponding source: https://github.com/spellcheck-ko/hunspell-dict-ko/tree/0.7.94 .
- hunspell-asm 4.0.2 wrapper: MIT, https://github.com/kwonoj/hunspell-asm . Local pnpm patch corrects the runtime ESM import and uses Web Crypto for temporary filesystem names. License: engine/hunspell-asm-LICENSE.
- Bundled Hunspell engine: MPL 1.1 / LGPL 2.1 / GPL tri-license, using MPL 1.1 terms. License: engine/COPYING.MPL. Upstream source and build instructions: https://github.com/kwonoj/hunspell-asm/blob/master/bootstrap.ts and https://github.com/hunspell/hunspell . The package records engine revision c06cd95-210713. No engine binary modifications.
- emscripten-wasm-loader 3.0.3: package metadata declares MIT, author OJ Kwon; https://github.com/kwonoj/emscripten-wasm-loader . Local pnpm patch uses Web Crypto for temporary filesystem names. Upstream package does not include a standalone license file; retain its package metadata and source attribution. Verify distribution notices before a public service release.

Checking is performed locally in a worker. No document text is sent to a checking service. Personal exceptions are exact strings stored in this browser, not a synchronized account dictionary. This release checks Korean only; inflected exceptions must be registered separately. It does not provide reliable contextual grammar or spacing correction.
