# ARCH-02D-B4b1d — independently verifiable history archive + additive restore

**2026-11-22.** Base `main=e74372561c9a4ca0d323d3358ccab951d49ae8b8`, [post-merge #44992249960](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44992249960) **SUCCESS** after #244. Draft PR ONLY; approved published PWA remains **v141**.

## Problem and authority boundaries

History currently lives **inside** `dune-goh-v1.conq.weekArchive` with no expiry and grows on each forward local week. B4b1c made full-save JSON transport possible, but restoring that file **replaces** later account progression. To enable future safe retention management, first create a separate offline archive that can be verified after the user independently saves it, and restored **additively** into the current history without activating any archived run. This stage does **not** prune, trim, offload or remove a single archived week from localStorage.

## Archive format / threat model

- The Conquest archive action is inside the existing verified full-save export view; the profile Golden screen is unchanged. JSON file `dune-goh-conquest-history-v1.json` contains only `{format:"dune-goh-conquest-history",version:1,sourceWeek,count,historyRaw,sha256}`. `historyRaw` is an exact `JSON.stringify` of every inert archived run, including `done/tk/route/disks`, captured **only from verified primary** under an owned Web Lock. `sha256` is the browser-native SHA-256 digest of the canonical UTF-8 **complete manifest** (`{format,version,sourceWeek,count,historyRaw}`), checked after an independent file chooser read. No timestamp from the untrusted OS, no server, no new save key, no altered RNG or rewards. Browser WebCrypto is REQUIRED; no silent downgrade to FNV or another weak checksum.
- **SHA-256 detects accidental modifications to file contents; a malicious person can recompute it.** Neither this hash nor `sourceWeek` proves account identity or earned rewards. Original saves contain no durable authenticated player ID. Imported archive records are NEVER authoritative for gameplay/claims; a player must explicitly recognize the file and accept the on-screen merge. The full v1 JSON backup should also be kept off device.
- Both source and restored records are required to be flat, full historical Conquest records (with `done/tk/route/disks` and valid past local-Monday keys). Duplicate `wk` inside a file is rejected. Matching existing weeks must have exactly matching JSON data; **conflicting duplicates are rejected, not overwritten**. No award flags are reset or merged. A file containing current/future weeks is refused.
- File input bounded to 8,000,000 bytes **before** allocation, rejects unexpected length, nonfatal Unicode replacement, unsupported envelope, wrong hash, malformed records, prototype keys and excessive nesting. Entire candidate also bounded to 8MB. `localStorage` quota remains independently variable.
- After async file read and hash, the original Web Lock must still be current, and the verified old primary unchanged. Preview shows exact number of new/duplicate weeks. On positive confirmation, existing `loadSave.writer.commit({expectedRaw,candidate})` stages the predecessor backup, byte-verifies the candidate and forces cold reload. Any quota, conflict, stolen writer or uncertain write is handled by existing fail-closed B2/B3 logic; no active run, hero, account resource, RNG or entitlement changes.
- If the file adds no new weeks, verification succeeds with no primary write and no rotated backup.

## Deferred, explicitly separate policy decision

**NO deletion button, automatic retention cap or archive compaction is included.** Even an independently verified SHA-256 after selecting a file does **not** prove that the user has kept a recoverable copy outside the origin or that Safari will retain it. A future owner-approved B4b1e may explore explicit user-requested removal of *selected, verified, independently stored* past weeks with warnings and a reversible rescue plan; never treat browser download-start as guaranteed backup. This stage adds a genuine additive recovery path but does not resolve unbounded storage growth by itself.

## CI / release gates

- New H01–H10 acceptance cases PWA + standalone × UTC/Europe/Amsterdam/America/Los_Angeles: exact snapshot archive, SHA-256 readback, additive merge without reward changes, idempotency, stale export, conflicting duplicates, tampering/unsafe archives, oversize, Web Locks loss, transactional quota failure and cold reload.
- Real Chromium proof for actual native file download, file chooser, verified merge/restart on both compiled builds (not mocked); preserve Golden 200 battles/41 screens, strict ABI, WebGL, offline and previous B4b1c F01–F10.
- No root PWA, `sw.js`, `dev/version.json` or Golden changes. No merge before exact-head Fast + Full SUCCESS, explicit owner approval and no PWA release.
