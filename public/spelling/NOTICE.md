# Spelling resources

The Wonboard application code is MIT. Third-party resources retain their own licenses.

## Current experimental bilingual checker

The current review Worker uses original Wonboard checking code and selected Open Korean Text, MeCab Ko Dic and English Speller Database/SCOWL data. No upstream checker engine is imported. Complete data license texts are in ../THIRD_PARTY_NOTICES.txt and the review dialog. Source revisions, hashes and transformations are recorded in third_party/spelling/generated manifests in the repository.

Korean spelling and spacing and English spelling are processed on the device. Drafts are not sent to a checking service. Personal words are stored on this device; supported Korean particles are recognized separately. General grammar and contextual correctness are not guaranteed.

## Historical releases

The legacy Hunspell implementation, its patches and Korean GPL dictionary are no longer shipped. There is no hidden fallback. Historical source and license notices remain in Git history at revision 6ff8520f9d718ea18d90baef6992d0713d4332e8 under public/spelling. This change does not remove obligations for past distributions.

Historical component versions: hunspell-dict-ko 0.7.94 (GPLv3), hunspell-asm 4.0.2 wrapper (MIT), bundled Hunspell engine (MPL 1.1 option), emscripten-wasm-loader 3.0.3 (MIT metadata). Their detailed notices and source links are preserved in the historical revision, not silently relicensed as Wonboard code.
