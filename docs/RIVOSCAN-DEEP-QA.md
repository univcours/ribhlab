# RivoScan Deep QA
Baseline: 0.45.95 / signed release, source aca01755407489b8f79e55fd9a4e2b53859f57e3.

Run on this branch or carry this workflow and scripts into subsequent RivoScan release branches. CI does not publish to Play, change store data or generate live ad clicks. Browser tests use the compiled application, not injected fake UI. Native baseline installs the checksum-pinned real APK on a dedicated offline emulator. It is not verification of future APKs.

Evidence: browser report.json, controls.csv, screenshots, parsed output PDF; Android XML, screenshots, logs. Each scenario indicates its tested level: functional, entry only, navigation/geometry. Inventory is not a functional pass. Design flags are findings for review (44 CSS px target is a heuristic, not a hard failure); offscreen scrollable elements are not automatically occluded. Native camera, OCR accuracy, ad serving, Android file operations, privacy transformations and remaining individual control behaviors require dedicated fixtures/device scenarios. Do not represent untested features as passed.

Release gate: require the web-functional-and-design check on future release PRs; do not treat the fixed baseline Android check as candidate verification. Before publishing a future APK, run native tests against that exact signed candidate and inspect open issues. Branch protection is not configured by this commit.
