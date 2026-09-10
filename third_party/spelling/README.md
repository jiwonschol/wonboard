# Prototype dictionary provenance

Acquired 2026-09-10. These data are not MIT-relicensed. Only the original Wonboard processing and checking code uses the project MIT license. Neither upstream checker implementation is imported.

* Open Korean Text: `https://github.com/open-korean-text/open-korean-text`, revision `74cc4ae7d3dab232747cd5ddb723e4b73c476e4f`. Original `LICENSE` saved here (11325 bytes). Apache-2.0; preserve license and mark transformations. Recursive tree inspection found no NOTICE file. Only basic noun/adverb/adjective/verb/josa/eomi text lists are selected; Wikipedia-derived and other thematic lists are excluded.
* English Speller Database (formerly SCOWL): `https://github.com/en-wl/wordlist`, revision `1e5b7d3a72f47a71da5d28686c1dd4b397178485`. Original `Copyright` saved here (4903 bytes), including all component notices. The permission grants redistribution and modification of generated word lists with notices; no checker code is imported. Recursive tree inspection found no separate NOTICE file. SCOWL 2020 was inspected but not acquired or used.

* MeCab Ko Dic (data only): `https://github.com/lindera/mecab-ko-dic`, revision `12439fb32808b9244ded56d7dfed96e4b8d76869`. Apache-2.0 license is retained in `mecab-ko-dic/COPYING`. Selected fields from Inflect.csv, MAG.csv and NNG.csv; costs and engine IDs are removed. Common nouns supplement recognition only, not segmentation or spelling-candidate generation. No MeCab engine code is included.

Source URLs, sizes and hashes are in generated manifests. Source JSON lives outside public/ but is now bundled into the experimental review Worker; it is therefore a distributed resource, not an unshipped prototype. Notices are available in the review dialog and public/THIRD_PARTY_NOTICES.txt. Existing released checker assets and their historical notices remain until the replacement quality gate passes; they are not a fallback for the new Worker.
