# ART-PROD-02 — asset import gate (2026-11-26)
Status: **local conversion PASS; actual Figma import BLOCKED / unverified**.
ART-PROD-01 receipt #323 merged at ffb55e779317462780e85c2c144028a0686a38f7, required CI run 45829035356 passed. Owner chose to continue without paid fal. No additional paid service or upgrade authorized.

Loaded installed figma-use and figma-generate-design skills. Session creation succeeded for existing working file xmv7tabGcWvHmWgAHmk4we. First metadata read rejected with "You've reached the Figma MCP tool call limit on the Starter plan." No image transfer, node mutation, or Figma screenshot occurred; no retries or account change. This is separate from previous WebP createImage failure.

## Local preparation
Recovered R13-PIPELINE-03-kit.zip and R13-PIPELINE-02-recovery.zip. Verified all 16 original WebP SHA-256 values and dimensions against kit manifest; converted all to RGBA PNG with Pillow, reopened and asserted exact decoded RGBA pixel equality and dimensions. All 16 have non-opaque alpha; retained original slice insets and provenance. Copied actual recovered opaque atrium JPEG (880x438) byte-identically. 17 assets, 811969 total asset bytes, archive integrity PASS. Inspected actual local checkerboard preview. Existing kit remains artistically unaccepted; no new art generated. Preview is not a Figma screenshot.

Library: /Dune GoH ART-PROD/ART-PROD-02-import-kit.zip, SHA256 3219c83a69f08cc719d35f9a7b904ff560c6cc0eaa2a4c8e387d359c61082897. Contains assets, manifest.json, prepare_png.py, local-preview.png. Original files untouched.

## Next decision
Do not buy Figma plan for this pilot. When access returns, import a real PNG in isolation, verify image fill metadata and actual screenshot. If continuing offline, use a versioned editable layer manifest and local source assets instead of claiming Figma master. ART-PROD-03 still requires recovery of approved full graphical reference or explicit replacement approval; no new HTML polish, flattened-screen hitboxes or runtime changes. A different free editor is an optional tool decision, not an accepted art direction. No release or Pages build needed.
