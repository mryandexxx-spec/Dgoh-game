# ARCH-02D-B4b1c — bounded offline JSON-file export/import

**Date:** 2026-11-22. **Base:** merged B4b1b #243, `main=6e7445487afe1b3e54a237e2121f20e60d6b3d59`; post-merge [CI #44988646998](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44988646998) SUCCESS. **Candidate, NO PWA publication.** Last explicitly approved published release remains v141.

## Design boundaries

- Reuse the existing `dune-goh-v1`, `v:1`, checkpoint primary/backup, exact-byte verified readback, mandatory `dune-goh-v1.writer` native Web Lock, explicit confirmation, no RAM adoption after import and restart-to-activate.
- **Export:** The already existing verified Base64 export overlay offers a second download option: save the **exact validated primary JSON bytes** as `dune-goh-v1-verified.json`, offline via native Blob + object URL. No reserialization from RAM, no pruning, no new save keys, no forced server, no changed Golden. If primary changes after export preview, refuse and request a fresh preview. Browser download initiation cannot prove a file was actually retained by the OS/user — the UI says so. A separate emergency RAM export stays explicitly unverified and does NOT get a verified-file button.
- **Import:** The existing import dialog offers a separate native JSON file input. Limit **8,000,000 UTF-8 bytes**, check file.size before allocating, verify arrayBuffer length, strict fatal UTF-8 decode, JSON.parse, existing validation before and after fillSave/metaFill; reject unsafe prototype keys, nested/invalid Conquest history, unsupported v2, bad balances, excessive depth and node count. The old Base64 2,000,000-character limit and its tests remain unchanged.
- Files require **live mandatory Web Locks**; no ungated import fallback. Recheck lock **after** asynchronous file read and again when preparing and confirming. A cancelled/replaced chooser/overlay or pagehide invalidates the async result; import must not restore any stale preview. The candidate is an isolated clone; only the existing writer.commit can stage the old primary in backup and byte-verify replacement. On success retire the writer and require fresh reload; on conflict/quota/uncertainty retain existing fail-closed behavior.
- 8MB is a conservative **File API memory guard, NOT a localStorage quota promise**. A large validated file may still fail its verified write due to browser quota and leave old progress intact. Export of an oversized primary is **not blocked** (emergency portability) but the overlay warns it cannot be imported in this version. No automatic archival eviction or compression; no duplicate claims from inert records.

## Gate / tests

- New F01–F10 scenarios (PWA + standalone, 3 TZ) exercise file UI, >2M character raw saves and archive markers, byte-accurate file export, legacy Base64 compatibility, bad UTF-8/oversize/v2/nested archive rejection, native Web Lock denied tab, async lease-loss, quota and stale-primary conflict, and the original backup/reload contracts.
- Separate **real native Chromium browser** proof (PWA + standalone): browser-generated JSON download exact-byte equal to verified primary, native file-picker import, user confirmation, previous verified backup and cold reload; no mocked File, Blob or Web Locks.
- Preserve ARCH-02C and B4b1b, strict 898 exports, v1 fixtures, Golden 200 battles/41 screens, WebGL, PWA offline and final gate. No Golden updates, no test weakening, no `dev/version.json` change and no root PWA publish.
- Later **B4b1d** (requires separate approval): optional user-authorized off-device historical archive, verified round-trip and only then deliberate retention handling. The new transport alone does **not** cap localStorage growth.

**Status:** candidate only; exact-head Fast + Full CI and owner's merge approval required; **PWA v141 remains unchanged**.
